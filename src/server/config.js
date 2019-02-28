const process = require('process');
const _ = require('lodash');

let defaults = {
  PORT: 3000,
  UNIPROT_INDEX: 'uniprot',
  UNIPROT_FILE_NAME: 'uniprot.xml',
  INPUT_PATH: 'input',
  UNIPROT_URL: 'ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.xml.gz'
};

let testDefaults = {
  UNIPROT_INDEX: 'uniprot-test',
  INPUT_PATH: 'test/input'
};

let testVars = process.env.NODE_ENV == 'test' ? testDefaults : {};

let envVars = _.pick( process.env, Object.keys( defaults ) );


let conf = Object.assign( {}, defaults, testVars, envVars );

Object.freeze( conf );

module.exports = conf;
