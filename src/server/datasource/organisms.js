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
const isSupportedOrganism = id => { // eslint-disable-line no-unused-vars
  return true; // all organisms are supported
};

/**
 * Get the index of the organism in its default ordering.  An earlier, lower index
 * indicates a higher precedence.
 * @param {string} id The organism taxon ID
 */
const getDefaultOrganismIndex = id => SORTED_MAIN_ORGANISMS.indexOf('' + id);

module.exports = { isSupportedOrganism, getDefaultOrganismIndex };
