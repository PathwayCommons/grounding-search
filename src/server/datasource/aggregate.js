/** @module aggregate */
import { db } from '../db';
import { rankInThread } from './rank';
import _ from 'lodash';
import ROOT_STRAINS from './strains/root';
import { getOrganismById } from './organisms';
import { MAX_SEARCH_WS, MAX_FUZZ_ES } from '../config';
import Future from 'fibers/future';

const ROOT_STRAIN_ORGS = Object.values(ROOT_STRAINS).map(getOrganismById);
const isRootStrainOrgId = id => ROOT_STRAIN_ORGS.some(org => org.is(id));

const filterSearchString = function(searchString){
  const rnaMatch = searchString.match(/(.*) (.*){0,2}rna/i);

  if( rnaMatch != null ){
    return rnaMatch[1];
  } else {
    return searchString;
  }
};

/**
 * Retrieve the entities matching best with the search string.
 * @param {string} searchString Key string for searching the best matching entities.
 * @param {(string|string[])} [namespace] An array of namespaces to search or a single namespace string (default NCBI and CHEBI)
 * @param {object} [organismOrdering] An array of organism taxon IDs.
 * Example: `[ '9606', '10090' ]`
 * This sets a preference of organism ordering when there is a distance tie (e.g.
 * P53 for human or P53 for mouse).  The ordering be, for example, the number
 * of times an organism is mentioned in a document or the number of prior groundings
 * associated with that organism in a document.  If not specified, a default ordering
 * is used based on the popularity of common model organisms.
 * @returns {Promise} Promise object represents the array of best matching entries.
 */
const search = function(searchString, namespace = ['ncbi', 'chebi'], organismOrdering){
  searchString = filterSearchString(searchString);

  const doSearch = fuzziness => db.search(searchString, namespace, fuzziness);
  const doRank = ents => rankInThread(ents, searchString, organismOrdering);
  const shortenList = ents => ents.slice(0, MAX_SEARCH_WS);

  const filterStrains = ents => {
    const sanitize = name => name.toLowerCase();

    return _.uniqWith(ents, (ent1, ent2) => {
      // only apply to org-specific ents
      if( ent1.organism == null || ent2.organism == null ){ return false; }

      const org1 = getOrganismById(ent1.organism);
      const org2 = getOrganismById(ent2.organism);
      const n1 = sanitize(ent1.name);
      const n2 = sanitize(ent2.name);
      const getSynonym = ent => ent.synonyms.length === 1 ? sanitize(ent.synonyms[0]) : null;
      const s1 = getSynonym(ent1) || '--nosynonym1';
      const s2 = getSynonym(ent2) || '--nosynonym2';

      return isRootStrainOrgId(org1.id) && org1.id === org2.id && (n1 === n2 || s1 === s2 || n1 === s2 || s1 === n2);
    });
  };

  const doStrainFilter = ents => {
    let task = Future.wrap(function(args, next){ // code in this block runs in its own thread
      let res = filterStrains(args.ents);
      let err = null;

      next( err, res );
    });

    return task({ ents }).promise();
  };

  const doSearches = () => {
    const join = ress => _.uniqWith(_.concat(...ress), (ent1, ent2) => {
      return ent1.namespace === ent2.namespace && ent1.id === ent2.id;
    });

    const doJoin = ress => {
      let task = Future.wrap(function(args, next){ // code in this block runs in its own thread
        let res = join(args.ress);
        let err = null;

        next( err, res );
      });

      return task({ ress }).promise();
    };

    if( searchString.length === 1 ){
      return doSearch(0);
    }

    return (
      Promise.all([ doSearch(0), doSearch(MAX_FUZZ_ES) ]) // exact search to make sure we always include exact matches
        .then(doJoin)
    );
  };

  return (
    Promise.resolve()
      .then(doSearches)
      .then(doRank)
      .then(shortenList)
      .then(doStrainFilter)
  );
};

/**
 * Retrieve the entity that has the given id.
 * @param {string} namespace  Namespace to seek the entity e.g. 'uniprot', 'chebi', ...
 * @param {string} id The id of entity to search
 * @returns {Promise} Promise objects represents the entity with the given id from the given namespace,
 * if there is no such entity it represents null.
 */
const get = function(namespace, id){
  return db.get(id, namespace);
};

/**
 * Map entities to a target namespace (dbto) from a given namespace and id.
 * @param {string} dbto dbPrefix of database to find records in
 * @param {string} dbfrom dbPrefix of database the provided id
 * @param {string} id The id of entity in the dbfrom database
 * @returns {Promise} Promise objects represents the entity with the given id from the given namespace,
 * if there is no such entity it represents null.
 */
const map = function( dbfrom, id, dbto ){
  return db.map( dbfrom, id, dbto );
};

export const aggregate = { search, get, map };
