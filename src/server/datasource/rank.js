/** @module rank */
import _ from 'lodash';
import { getOrganismIndex, getDefaultOrganismIndex } from './organisms';
import dice from 'dice-coefficient'; // sorensen dice coeff
import Future from 'fibers/future';

const DISTANCE_FIELDS = ['name', 'synonyms']; // TODO should share list with db.js

const isChemical = ent => ent.namespace === 'chebi';

/**
 * Get the distance between the two strings.
 * @param {string} a Get the
 * @param {String} b Entity B
 * @returns {Number} The distance between the strings, ranging on [0, 1] with
 * lower values indicating a smaller distance between the strings.
 */
const stringDistanceMetric = (a, b) => {
  return 1 - dice(a.toLowerCase(), b.toLowerCase());
};

/**
 * Get the string distance between an entity and a search string.
 * @param {EntityJson} ent The entity to test.
 * @param {String} searchTerm The search term (usually typed by a user as the name
 * of something he's looking for).
 * @returns {Number} The distance.
 */
const getDistance = (ent, searchTerm) => {
  if( ent.distance != null ){ return ent.distance; } // cached distance

  let undef = Number.MAX_SAFE_INTEGER;
  let dist = undef;

  // overall dist is min distance of all checked fields
  let checkDist = val => {
    let d = val == null ? undef : stringDistanceMetric( searchTerm, val );

    dist = Math.min( d, dist );
  };

  // check a field
  let check = val => {
    if( _.isArray(val) ){
      val.forEach( checkDist );
    } else {
      checkDist( val );
    }
  };

  DISTANCE_FIELDS.forEach( k => check( ent[k] ) );

  ent.distance = dist; // store cached distance in-place

  return dist;
};

/**
 * Rank an array of entities.
 * @param {EntityJSON} ents An array of entities to sort.
 * @param {string} searchTerm The search term used for sorting the entities.
 * @param {object} [organismIndices] An object map of organism taxon IDs to the
 * relative weight of the organisms.  Example: `{ '9606': 3, '10090': 1 }`
 * This sets a preference of organism ordering when there is a distance tie (e.g.
 * P53 for human or P53 for mouse).  The counts ould be, for example, the number
 * of times an organism is mentioned in a document or the number of prior groundings
 * associated with that organism in a document.  If not specified, a default ordering
 * is used based on the popularity of common model organisms.
 * @returns The sorted, ranked array of entities.  The best matches come first.
 */
export const rank = (ents, searchTerm, organismOrdering) => {
  const dist = ent => getDistance(ent, searchTerm);

  // ensure that taxon ids are strings
  if( organismOrdering != null ){
    organismOrdering = organismOrdering.map(id => id + '');
  }

  ents.forEach(ent => {
    ent.defaultOrganismIndex = getDefaultOrganismIndex(ent.organism);

    if( organismOrdering == null ){
      ent.organismIndex = ent.defaultOrganismIndex;
    } else {
      ent.organismIndex = getOrganismIndex(ent.organism, organismOrdering);
    }
  });

  const cmp = (a, b) => {
    const da = dist(a);
    const db = dist(b);

    const distDiff = da - db;
    if( distDiff !== 0 ){ return distDiff; }

    const orgDiff = a.organismIndex - b.organismIndex;
    if( orgDiff !== 0 ){ return orgDiff; }

    const defOrgDiff = a.defaultOrganismIndex - b.defaultOrganismIndex;
    if( defOrgDiff !== 0 ){ return defOrgDiff; }

    if( isChemical(a) && isChemical(b) && a.charge !== b.charge ){
      if( a.charge === 0 ){
        return -1;
      } else {
        return 1;
      }
    }

    // if all else is equal, use the elasticsearch score
    return a.esScore - b.esScore;
  };

  return ents.sort(cmp);
};

export const rankInThread = (ents, searchTerm, organismOrdering) => {
  let task = Future.wrap(function(args, next){ // code in this block runs in its own thread
    let res = rank(args.ents, args.searchTerm, args.organismOrdering);
    let err = null;

    next( err, res );
  });

  return task({ ents, searchTerm, organismOrdering }).promise();
};

