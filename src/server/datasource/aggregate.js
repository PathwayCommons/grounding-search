/** @module aggregate */
import { db } from '../db';
import { rankInThread } from './rank';
import _ from 'lodash';
import ROOT_STRAINS from './strains/root';
import { getOrganismById, OTHER } from './organisms';
import { MAX_SEARCH_WS, MAX_FUZZ_ES } from '../config';

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
 * @param {object} [organismOrdering] An array of organism taxon IDs.
 * Example: `[ '9606', '10090' ]`
 * This sets a preference of organism ordering when there is a distance tie (e.g.
 * P53 for human or P53 for mouse).  The ordering be, for example, the number
 * of times an organism is mentioned in a document or the number of prior groundings
 * associated with that organism in a document.  If not specified, a default ordering
 * is used based on the popularity of common model organisms.
 * @returns {Promise} Promise object represents the array of best matching entries.
 */
const search = function(searchString, namespace, organismOrdering){
  searchString = filterSearchString(searchString);

  if ( organismOrdering ) {
    organismOrdering = organismOrdering.map( orgId => {
      const org = getOrganismById(orgId);

      if( org.is(OTHER.id) ){ // not included in model organism set
        return orgId;
      } else { // may have been specified as strain, so use root id
        return org.id;
      }
    } );

    organismOrdering = _.uniq( organismOrdering );
  }

  const doSearch = fuzziness => db.search(searchString, namespace, fuzziness);
  const doRank = ents => rankInThread(ents, searchString, organismOrdering);
  const shortenList = ents => ents.slice(0, MAX_SEARCH_WS);

  const doStrainFilter = ents => { // TODO process in thread
    const sanitize = name => name.toLowerCase();

    return _.uniqWith(ents, (ent1, ent2) => {
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

  const filterOtherOrganisms = ents => { // TODO do in thread
    const isOther = ent => getOrganismById(ent.organism).is(OTHER.id);
    const isKnown = ent => !isOther(ent);

    return ents.filter(isKnown);
  };

  const doSearches = () => {
    return (
      Promise.all([ doSearch(0), doSearch(MAX_FUZZ_ES) ]) // exact search to make sure we always include exact matches
        .then(ress => _.uniqBy(_.concat(...ress), ent => `${ent.namespace}:${ent.id}`)) // join & unique -- TODO process in thread
    );
  };

  return (
    Promise.resolve()
      .then(doSearches)
      .then(filterOtherOrganisms)
      .then(doStrainFilter)
      .then(doRank)
      .then(shortenList)
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

export const aggregate = { search, get };
