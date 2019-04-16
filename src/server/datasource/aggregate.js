/** @module aggregate */
import { db } from '../db';

/**
 * Retrieve the entities matching best with the search string.
 * @param {string} searchString Key string for searching the best matching entities.
 * @returns {Promise} Promise object represents the array of best matching entries.
 */
const search = function(searchString){
  // for now no sorting...

  // something more sophisticated could be done later
  return db.search(searchString);
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
