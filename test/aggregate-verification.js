import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { db } from '../src/server/db';
import _ from 'lodash';

const sampleEntityNames = [ 'tp53', 'mdm2', 'iron' ];
const sampleEntityIds = [ 'CHEBI:53438', 'Q7LG56' ];

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};
const searchEntity = ( entityName, ds ) => ds.search( entityName );
const getEntity = ( entityId, ds ) => ds.get( entityId );
const searchFromDatasources = entityName => applyToEachDS( ds => searchEntity( entityName, ds ) );
const getFromDatasources = entityId => applyToEachDS( ds => getEntity( entityId, ds ) );
const aggregateSearch = entityName => searchEntity( entityName, aggregate );
const aggregateGet = entityId => aggregate.get( null, entityId );
const removeTestIndex = () => db.deleteIndex();

describe('Search and Get Aggregate', function(){
  // loading test data may need a higher timeout
  // depending on the platform
  this.timeout(6000);

  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  it('verify aggregate search query', function(done) {
    let promises = sampleEntityNames.map( entityName => {
      let dsPromise = searchFromDatasources( entityName );
      let aggregatePromise = aggregateSearch( entityName );

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

          expect( slicedDsResults, `aggregate search query results includes best search results from each datasources for ${entityName}` ).to.deep.equal( intersections );
        });
    } );

    Promise.all( promises )
      .should.be.fulfilled
      .then( () => done(), error => done(error) );
  });

  it('verify aggregate get query', function(done){
    let promises = sampleEntityIds.map( entityId => {
      let dsPromise = getFromDatasources( entityId );
      let aggregatePromise = aggregateGet( entityId );

      return Promise.all( [ dsPromise, aggregatePromise ] )
        .then( ( [ dsResults, aggregateRes ] ) => {
          expect( dsResults, `aggregate get query result comes from a valid datasource for ${entityId}` ).to.deep.include( aggregateRes );
        } );
    } );

    Promise.all( promises )
      .should.be.fulfilled
      .then( () => done(), error => done(error) );
  });
});
