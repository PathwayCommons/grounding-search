/** @module rank */
import _ from 'lodash';
import { getDefaultOrganismIndex } from './datasource/organisms';
import dice from 'dice-coefficient'; // sorensen dice coeff

const DISTANCE_FIELDS = ['name', 'synonyms']; // TODO should share list with db.js

/**
 * Get the distance between the two strings.
 * @param {string} a Get the
 * @param {string} b Entity B
 * @returns {number} The distance between the strings, ranging on [0, 1] with
 * lower values indicating a smaller distance between the strings.
 */
const stringDistanceMetric = (a, b) => {
  return 1 - dice(a, b);
};

/**
 * Get the string distance between an entity and a search string.
 * @param {EntityJson} ent The entity to test.
 * @param {string} searchTerm The search term (usually typed by a user as the name
 * of something he's looking for).
 * @returns {number} The distance.
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
 * @param {object} [organismCounts] An object map of organism taxon IDs to the
 * relative weight of the organisms.  This sets a preference of organism ordering
 * when there is a distance tie (e.g. P53 for human or P53 for mouse).  The counts
 * could be, for example, the number of times an organism is mentioned in a document
 * or the number of prior groundings associated with that organism in a document.
 * If not specified, a default ordering is used based on the popularity of common
 * model organisms.
 * @returns The sorted, ranked array of entities.  The best matches come first.
 */
const rank = (ents, searchTerm, organismCounts = {}) => {
  let dist = ent => getDistance(ent, searchTerm);

  let orgCount = ent => ent.organism == null ? 0 : (organismCounts[ent.organism] || 0);

  let sortByDistThenOrgs = (a, b) => {
    let distDiff = dist(a) - dist(b);

    if( distDiff === 0 ){
      let orgDiff = orgCount(b) - orgCount(a);

      if( orgDiff === 0 ){
        let defaultOrgDiff = getDefaultOrganismIndex(a) - getDefaultOrganismIndex(b);

        return defaultOrgDiff;
      } else {
        return orgDiff;
      }
    } else {
      return distDiff;
    }
  };

  return ents.sort(sortByDistThenOrgs);
};


export { rank };
