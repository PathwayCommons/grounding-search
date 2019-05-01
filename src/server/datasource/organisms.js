/** @module organism */

/**
 * This ordering determines the default sorting of results by organism.
 */
const SORTED_MAIN_ORGANISMS = [
  '9606',  // h. sapiens
  '10090', // m. musculus
  '4932', // s. cervisiae
  '7227', // d. melonogaster
  '83333',  // e. coli
  '6239', // c. elegans
  '3702', // a. thaliana
  '10116', // r. norvegicus
  '7955' // d. rerio
];

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
  return getOrganismIndex(id, SORTED_MAIN_ORGANISMS);
};

/**
 * Get the index of the organism in its default ordering.  An earlier, lower index
 * indicates a higher precedence.
 * @param {string} id The organism taxon ID
 * @param {Array[string]} organismOrdering A sorted array of taxon IDs to use for getting the index
 */
export const getOrganismIndex = (id, organismOrdering) => {
  const length = organismOrdering.length;
  const index = organismOrdering.indexOf('' + id);

  if( index === -1 ){ // not found
    return length;
  } else {
    return index;
  }
};