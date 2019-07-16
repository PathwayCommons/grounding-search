/** @module aggregate */
import { db } from '../db';
import { rankInThread } from './rank';
import _ from 'lodash';
import ROOT_STRAINS from './strains/root';
import { getOrganismById } from './organisms';
import { MAX_SEARCH_WS, MAX_FUZZ_ES } from '../config';

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
      let rootNames = Object.keys( ROOT_STRAINS );
      for ( let i = 0; i < rootNames.length; i++ ) {
        let rootOrgId = ROOT_STRAINS[ rootNames[ i ] ];
        let rootOrg = getOrganismById( rootOrgId );
        let descendantOrgIds = rootOrg.descendantIds;

        if ( _.includes( descendantOrgIds, '' + orgId ) ) {
          return rootOrgId;
        }
      }

      return orgId;
    } );

    organismOrdering = _.uniq( organismOrdering );
  }

  const doSearch = fuzziness => db.search(searchString, namespace, fuzziness);
  const doRank = ents => rankInThread(ents, searchString, organismOrdering);
  const shortenList = ents => ents.slice(0, MAX_SEARCH_WS);

  const doSearches = () => {
    return (
      Promise.all([ doSearch(0), doSearch(MAX_FUZZ_ES) ]) // exact search to make sure we always include exact matches
        .then(ress => _.uniqBy(_.concat(...ress), ent => `${ent.namespace}:${ent.id}`))
    );
  };

  return (
    Promise.resolve()
      .then(doSearches)
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
