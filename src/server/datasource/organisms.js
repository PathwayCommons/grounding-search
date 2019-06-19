/** @module organism */

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

  new Organism(4932, 'Saccharomyces cervisiae', [
    1337652,
    1158204,
    765312,
    1216345,
    1290389,
    1247190,
    1390929,
    1390930,
    1390932,
    1390931,
    1266529,
    717647,
    1218710,
    1337549,
    1337552,
    1337553,
    1337554,
    1337555,
    1337556,
    1337557,
    1337558,
    1337559,
    929587,
    1337560,
    1337562,
    1337561,
    1337563,
    464025,
    929629,
    947035,
    1095001,
    947036,
    1337437,
    1416897,
    1097555,
    1204498,
    947037,
    471510,
    1352824,
    1391042,
    614664,
    1144731,
    1216859,
    1158205,
    1337644,
    1337647,
    538975,
    1337651,
    1337649,
    1337650,
    1149757,
    1162671,
    1162672,
    1162673,
    1162674,
    1337645,
    1337654,
    1337655,
    1337646,
    614665,
    1234807,
    1201112,
    1352823,
    947038,
    1330326,
    1331972,
    1177187,
    1182968,
    1220494,
    947039,
    1182966,
    1182967,
    1337438,
    1196866,
    1418121,
    1382555,
    1337653,
    658763,
    580239,
    559292,
    545124,
    764097,
    889517,
    764102,
    764101,
    574961,
    721032,
    643680,
    764098,
    285006,
    764099,
    307796,
    764100,
    929585,
    471859,
    947040,
    1434269,
    1348153,
    1138861,
    580240,
    466209,
    462210,
    471861,
    927256,
    927257,
    462209,
    927258,
    1337492,
    1337493,
    1337494,
    1296266,
    1292971,
    1337495,
    1337496,
    1337497,
    1337498,
    1337499,
    1337500,
    1337501,
    1337502,
    1337503,
    1337504,
    1337505,
    1337506,
    1337507,
    1337508,
    1337509,
    1337510,
    1337511,
    1337512,
    1337513,
    1337514,
    1337515,
    1337516,
    1337517,
    1337518,
    1337519,
    1337520,
    1337521,
    1337522,
    1337523,
    1337531,
    1337532,
    1293430,
    1294333,
    1337524,
    1337533,
    1337534,
    1337535,
    1337536,
    1337537,
    1337538,
    1337539,
    1337540,
    1337541,
    1337542,
    1294334,
    1294335,
    1294336,
    1294337,
    1294338,
    1294339,
    1294340,
    1294341,
    1294342,
    1337543,
    1294343,
    1337544,
    1337525,
    1294344,
    1294345,
    1294346,
    1294347,
    1294348,
    1294349,
    1294350,
    1294351,
    1294352,
    1294353,
    1294354,
    1294355,
    1294356,
    1294357,
    1294358,
    1294359,
    1294360,
    1294361,
    1294362,
    1294363,
    1294364,
    1294365,
    1294366,
    1294367,
    1294368,
    1294369,
    1294370,
    1294371,
    1294372,
    1294373,
    1294374,
    1294375,
    1337526,
    1294376,
    1294377,
    1294378,
    1294379,
    1294380,
    1294381,
    1294382,
    1294383,
    1294384,
    1294385,
    1294386,
    1294387,
    1294388,
    1294303,
    1294304,
    1294305,
    1337436,
    1294306,
    1294307,
    929586,
    1294308,
    1294309,
    947041,
    1337527,
    947042,
    468558,
    1337528,
    1337529,
    947043,
    947044,
    1337439,
    1337440,
    1337441,
    1337442,
    1337443,
    1337444,
    1337445,
    1294310,
    502869,
    1294311,
    1337530,
    1337446,
    1294312,
    1337447,
    1337448,
    1337449,
    1294313,
    1337450,
    1337451,
    1294314,
    1294315,
    1294316,
    1337452,
    1337453,
    1294317,
    1337454,
    947045,
    1337455,
    1337456,
    1337457,
    1337458,
    1337459,
    1337460,
    1337461,
    1337462,
    1294318,
    1294319,
    1294320,
    1294321,
    1294322,
    1337463,
    1337464,
    1337465,
    1337466,
    1337467,
    1337468,
    1337469,
    1337470,
    1337471,
    1337472,
    1337473,
    1337474,
    1337475,
    1337476,
    1337477,
    1337478,
    1337479,
    1337480,
    1337481,
    1337482,
    1337483,
    1337484,
    1337485,
    1337486,
    1337487,
    1337488,
    1337489,
    1337490,
    1337491,
    1294323,
    1294324,
    1294325,
    1294326,
    1294327,
    1294328,
    1294329,
    1294330,
    1294331,
    1294332,
    1087981,
    1419746,
    947046,
    538976,
    1227742,
    41870
  ]),

  new Organism(7227, 'Drosophila melanogaster'),

  new Organism(83333, 'Escherichia coli', [
    679895,
    1318715,
    1245474,
    527799,
    1211845,
    694524,
    694525,
    694526,
    694527,
    694528,
    694529,
    694530,
    694531,
    694532,
    694514,
    694515,
    694516,
    694517,
    694518,
    694519,
    694520,
    694521,
    694522,
    694523,
    531853,
    1208340,
    1403831,
    1110693,
    511145,
    879462,
    1420014,
    316385,
    595496,
    316407,
    1385755
  ]),

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