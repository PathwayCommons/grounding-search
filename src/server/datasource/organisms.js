/** @module organism */

import ECOLI_STRAIN_IDS from './strains/e-coli';
import SCERVISIAE_STRAIN_IDS from './strains/s-cervisiae';

/**
 * An `Organism` object contains the taxon ID of the organism and other data
 * about the organism.
 */
class Organism {
  /**
   * Create an organism.
   * @param {String} id The taxon ID of the organism.
   * @param {String} name The name of the organism.
   * @param {Array[String]} descendantIds An array of taxon IDs for the descendants or strains of the organism.
   */
  constructor(id, name, descendantIds = []){
    this.id = '' + id;
    this.name = name;
    this.descendantIds = descendantIds;
    this.ids = [this.id, ...this.descendantIds].map(id => '' + id);
  }

  /**
   * Get whether the passed ID is one of the possible taxon IDs for the organism.
   * @param {String} id The taxon ID to check.
   * @returns Returns true if the passed ID matches the main organism ID or one of the descendant IDs.
   */
  is(id){
    id = '' + id;

    const idMatches = idToCheck => idToCheck === id;

    return this.ids.some(idMatches);
  }
}

/**
 * This ordering determines the default sorting of results by organism.
 */
const SORTED_MAIN_ORGANISMS = [
  new Organism(9606, 'Homo sapiens'),
  new Organism(10090, 'Mus musculus'),
  new Organism(4932, 'Saccharomyces cervisiae', SCERVISIAE_STRAIN_IDS),
  new Organism(7227, 'Drosophila melanogaster'),
  new Organism(562, 'Escherichia coli', ECOLI_STRAIN_IDS),
  new Organism(6239, 'Caenorhabditis elegans'),
  new Organism(3702, 'Arabidopsis thaliana'),
  new Organism(10116, 'Rattus norvegicus'),
  new Organism(7955, 'Danio rerio')
];

const DEFAULT_ORGANISM_ORDERING = SORTED_MAIN_ORGANISMS.reduce((ordering, org) => {
  org.ids.forEach(id => ordering.push(id));

  return ordering;
}, []);

const indexMap = new Map();

DEFAULT_ORGANISM_ORDERING.forEach((id, index) => {
  indexMap.set(id, index);
});

/**
 * Get whether an organism is supported by the system and should be shown in search
 * results.
 * @param {string} id The organism taxon ID
 */
export const isSupportedOrganism = id => { // eslint-disable-line no-unused-vars
  return true; // all organisms are supported
};

/**
 * Get the index of the organism in its default ordering.  An earlier, lower index
 * indicates a higher precedence.
 * @param {string} id The organism taxon ID
 */
export const getDefaultOrganismIndex = id => {
  return getOrganismIndex(id, DEFAULT_ORGANISM_ORDERING);
};

/**
 * Get the index of the organism in its default ordering.  An earlier, lower index
 * indicates a higher precedence.
 * @param {string} id The organism taxon ID
 * @param {Array[string]} organismOrdering A sorted array of taxon IDs to use for getting the index
 */
export const getOrganismIndex = (id, organismOrdering = []) => {
  if(id == null){ return 0; } // if org doesn't apply, then it's the same as an org match

  const length = organismOrdering.length;
  const index = organismOrdering === DEFAULT_ORGANISM_ORDERING ? indexMap.get(id) : organismOrdering.indexOf(id);

  if( index == null || index === -1 ){ // not found
    return length;
  } else {
    return index;
  }
};