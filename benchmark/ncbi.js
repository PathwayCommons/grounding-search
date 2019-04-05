const BenchmarkDatasource = require('./datasource');

const operation = 'search';
const datasource = 'ncbi';

let list = [
  { operation, geneName: 'tp53' },
  { operation, geneName: 'mdm2' }
];

BenchmarkDatasource( datasource, list );
