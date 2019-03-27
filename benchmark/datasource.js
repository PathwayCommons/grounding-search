/* eslint-disable no-console */
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const uniprot = require('../src/server/datasource/uniprot');
const chebi = require('../src/server/datasource/chebi');

const datasources = { uniprot, chebi }

function BenchmarkDatasource( datasourceName, list ) {
  const datasource = datasources[ datasourceName ];

  list.forEach( item => {
    let operation = item.operation;
    let geneName = item.geneName;
    let descr = `${datasourceName}#${operation}#${geneName}`;
    suite.add( descr, {
      defer: true,
      fn: deferred => {
        datasource[operation](geneName).then( () => deferred.resolve() );
      }
    } )
  } );

  // add listeners
  suite.on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run({ 'async': true });
}

module.exports = BenchmarkDatasource;
