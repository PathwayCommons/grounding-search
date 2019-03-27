const process = require('process');
const _ = require('lodash');

let defaults = {
  PORT: 3000,
  INDEX: 'groundingsearch',
  INPUT_PATH: 'input',
  UNIPROT_FILE_NAME: 'uniprot.xml',
  UNIPROT_URL: 'ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.xml.gz',
  CHEBI_FILE_NAME: 'chebi.owl',
  CHEBI_URL: 'ftp://ftp.ebi.ac.uk/pub/databases/chebi/ontology/chebi.owl.gz'
};

let envVars = _.pick( process.env, Object.keys( defaults ) );


let conf = Object.assign( {}, defaults, envVars );

Object.freeze( conf );

module.exports = conf;
