import _ from 'lodash';
import MOLECULAR_CELL from './data/molecular-cell.json';
import TOP_NCBI_GENE from './data/top-ncbi-gene.json';
import PC_BLACKLIST from './data/pc-blacklist.json';
import SARS_COV_2 from './data/sars-cov-2.json';

const SEARCH_OBJECTS = _.concat( [],
  MOLECULAR_CELL,
  TOP_NCBI_GENE,
  PC_BLACKLIST,
  SARS_COV_2
);

export { SEARCH_OBJECTS };
