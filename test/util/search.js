const _ = require('lodash');

const MOLECULAR_CELL = require('./data/molecular-cell.json');
const TOP_NCBI_GENE = require('./data/top-ncbi-gene.json');
const PC_BLACKLIST = require('./data/pc-blacklist.json');

const SEARCH_OBJECTS = _.concat( [], 
    MOLECULAR_CELL, 
    TOP_NCBI_GENE,
    PC_BLACKLIST
  );

export { SEARCH_OBJECTS };
