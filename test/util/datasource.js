const aggregate = require('../../src/server/datasource/aggregate');
const uniprot = require('../../src/server/datasource/uniprot');
const chebi = require('../../src/server/datasource/chebi');
const ncbi = require('../../src/server/datasource/ncbi');

const datasources = [ uniprot, chebi, ncbi ];

const applyToEachDS = op => {
  let promises = datasources.map( ds => op( ds ) );
  return Promise.all( promises );
};

module.exports = { aggregate, uniprot, chebi, ncbi, datasources, applyToEachDS };
