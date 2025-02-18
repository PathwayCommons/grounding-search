/** @module aggregate */
import { db } from '../db';
import { rankInThread } from './rank';
import _ from 'lodash';
import ROOT_STRAINS from './strains/root';
import { getOrganismById } from './organisms';
import { MAX_SEARCH_WS, MAX_FUZZ_ES } from '../config';

const ROOT_STRAIN_ORGS = Object.values(ROOT_STRAINS).map(getOrganismById);
const isRootStrainOrgId = id => ROOT_STRAIN_ORGS.some(org => org.is(id));

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
const search = function(searchString, namespace = ['ncbi', 'chebi', 'fplx'], organismOrdering){
  const doSearch = fuzziness => db.search(searchString, namespace, fuzziness);
  const doRank = ents => rankInThread(ents, searchString, organismOrdering);
  const shortenList = ents => ents.slice(0, MAX_SEARCH_WS);

  /**
   * De-duplicate those 'similar' records belonging to strains of the same species.
   * The rationale is that this function effectively merges the same gene in different strains.
   * E.g. Elasticsearch search for 'recA' returns two E. coli entries
   * (ncbigene:914722; ncbigene:947170) for the same gene reported in K-12 substr. MG1655 and
   * O157:H7 str. Sakai, respectively.
   *
   * Criteria for uniqueness among pairs:
   *  - pair of entities are among the ROOT_STRAIN_ORGS (i.e. E. coli, S. cerevisae)
   *  - At least one of the following are equal between the pair
   *    - 'name'
   *    - 'synonym' when there is only one for each
   *
   * @param {Array} ents The search hits consisting of bioentities
   * @returns {Array} ents whereby search hits remove
   */
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

  const doStrainFilter = (ents) => {
    return new Promise((resolve, reject) => {
      try {
        const res = filterStrains(ents);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    });
  };

  const doSearches = () => {
    const join = ress => _.uniqWith(_.concat(...ress), (ent1, ent2) => {
      return ent1.namespace === ent2.namespace && ent1.id === ent2.id;
    });

    const doJoin = (ress) => {
      return new Promise((resolve, reject) => {
        try {
          const res = join(ress);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
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
 * Retrieve dbXrefs in another database, given a db and one or more ids
 * @param {string} dbto MIRIAM prefix of target database
 * @param {string} dbfrom MIRIAM prefix of source database
 * @param {string | Object} id The identifier or list of identifiers in dbfrom
 * @returns {Promise} Promise objects containing dbXrefs for each element of id
 */
const map = function( dbfrom, id, dbto ){
  return db.map( dbfrom, id, dbto );
};

export const aggregate = { search, get, map };
