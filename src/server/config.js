const process = require('process');
const _ = require('lodash');

let defaults = {
  PORT: 3000,
  MAX_SEARCH_ES: 1000,
  MAX_SEARCH_WS: 100, // reduce this number later (probably 10 is ok)
  INDEX: 'groundingsearch',
  INPUT_PATH: 'input',
  UNIPROT_FILE_NAME: 'uniprot.xml',
  UNIPROT_URL: 'ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.xml.gz',
  CHEBI_FILE_NAME: 'chebi.owl',
  CHEBI_URL: 'ftp://ftp.ebi.ac.uk/pub/databases/chebi/ontology/chebi.owl.gz',
  NCBI_FILE_NAME: 'ncbi',
  NCBI_URL: 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene_info.gz'
};

let envVars = _.pick( process.env, Object.keys( defaults ) );


let conf = Object.assign( {}, defaults, envVars );

Object.freeze( conf );

module.exports = conf;
