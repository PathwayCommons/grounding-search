import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { db } from '../src/server/db';
import _ from 'lodash';

const sampleEntityNames = [ 'tp53', 'mdm2', 'iron' ];

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};
const searchEntity = ( entityName, ds ) => ds.search( entityName );
const searchFromDatasources = entityName => applyToEachDS( ds => searchEntity( entityName, ds ) );
const aggregateSearch = entityName => searchEntity( entityName, aggregate );
const removeTestIndex = () => db.deleteIndex();

describe('Query Aggregate', function(){
  this.timeout(10000);

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
});
