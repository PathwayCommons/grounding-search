const BenchmarkDatasource = require('./datasource');

const operation = 'search';
const datasource = 'chebi';

let list = [
  { operation, geneName: 'iron' },
  { operation, geneName: 'enoyl' }
];

BenchmarkDatasource( datasource, list );
