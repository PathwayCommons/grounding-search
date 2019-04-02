const aggregate = require('../../src/server/datasource/aggregate');
const uniprot = require('../../src/server/datasource/uniprot');
const chebi = require('../../src/server/datasource/chebi');

const datasources = [ uniprot, chebi ];

const applyToEachDS = op => {
  let promises = datasources.map( ds => op( ds ) );
  return Promise.all( promises );
};

module.exports = { aggregate, uniprot, chebi, datasources, applyToEachDS };
