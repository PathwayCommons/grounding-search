const { expect, should } = require('./util/chai');
const { aggregate, applyToEachDS } = require('./util/datasource');
const { forceDownload, buildIndex } = require('./util/param');
const db = require('../src/server/db');
const _ = require('lodash');

const sampleGeneNames = [ 'tp53', 'mdm2', 'iron' ];
const sampleGeneIds = [ 'CHEBI:53438', 'Q7LG56' ];

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};
const searchGene = ( geneName, ds ) => ds.search( geneName );
const getGene = ( geneId, ds ) => ds.get( geneId );
const searchFromDatasources = geneName => applyToEachDS( ds => searchGene( geneName, ds ) );
const getFromDatasources = geneId => applyToEachDS( ds => getGene( geneId, ds ) );
const aggregateSearch = geneName => searchGene( geneName, aggregate );
const aggregateGet = geneId => aggregate.get( null, geneId );
const removeTestIndex = () => db.deleteIndex();

describe('Search and Get Aggregate', function(){
  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  it('verify aggregate search query', function(done) {
    let promises = sampleGeneNames.map( geneName => {
      let dsPromise = searchFromDatasources( geneName );
      let aggregatePromise = aggregateSearch( geneName );

      return Promise.all( [ dsPromise, aggregatePromise ] )
        .then( ( [ dsResults, aggregateRes ] ) => {
          let intersections = [];
          let slicedDsResults = [];

          dsResults.forEach( dsRes => {
            let intersection = _.intersection( dsRes, aggregateRes );
            intersections.push( intersection );

            let slicedDsRes = dsRes.slice( 0, intersection.length );
            slicedDsResults.push( slicedDsRes );
          } );

          expect( slicedDsResults, `aggregate search query results includes best search results from each datasources for ${geneName}` ).to.deep.equal( intersections );
        });
    } );

    Promise.all( promises )
      .should.be.fulfilled
      .then( () => done(), error => done(error) );
  });

  it('verify aggregate get query', function(done){
    let promises = sampleGeneIds.map( geneId => {
      let dsPromise = getFromDatasources( geneId );
      let aggregatePromise = aggregateGet( geneId );

      return Promise.all( [ dsPromise, aggregatePromise ] )
        .then( ( [ dsResults, aggregateRes ] ) => {
          expect( dsResults, `aggregate get query result comes from a valid datasource for ${geneId}` ).to.deep.include( aggregateRes );
        } );
    } );

    Promise.all( promises )
      .should.be.fulfilled
      .then( () => done(), error => done(error) );
  });
});
