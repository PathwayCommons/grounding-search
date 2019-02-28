// example file from docs
// https://benchmarkjs.com/docs

/* eslint-disable no-console */
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const uniprot = require('../src/server/datasource/uniprot');

const delay = new Promise( ( resolve, reject ) => {
  setTimeout( resolve, 1000 );
} );

// add tests
suite.add('uniprot#search#tp53', {
  defer : true,
  fn: deferred => {
    uniprot.search('tp53').then( () => deferred.resolve() );
  }
})
  .add('uniprot#search#mdm2', {
    defer : true,
    fn: deferred => {
      uniprot.search('mdm2').then( () => deferred.resolve() );
    }
  })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  // run async
  .run({ 'async': true });
