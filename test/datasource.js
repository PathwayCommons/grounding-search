import { expect } from './util/chai';
import _ from 'lodash';
import { db } from '../src/server/db';
import { forceDownload, maxSearchSize } from './util/param';

function DatasourceTest( opts ) {
  const { sampleEntityNames, sampleEntityId, datasource, namespace, entryCount, minEntryCount, maxEntryCount, buildIndex } = opts;

  const updateTestData = () => datasource.update(forceDownload);
  const clearTestData = () => datasource.clear();
  const removeTestIndex = () => db.deleteIndex();
  const indexExists = () => db.exists();
  const getEntryCount = () => db.count( namespace );
  const searchEntity = entityName => datasource.search( entityName, 0, maxSearchSize );
  const getEntity = id => datasource.get( id );
  const getEntityId = e => _.get( e, 'id' );


  describe(`Update Data ${namespace}`, function(){
    before( function() {
      if ( !buildIndex ) {
        this.skip();
      }
    } );

    if ( buildIndex ) {
      after( removeTestIndex );
    }

    it(`update test data ${namespace}`, function( done ){
      this.timeout(10000);

      updateTestData().should.be.fulfilled
        .then( () => indexExists().should.eventually.be.equal( true, 'index is created to load data' ) )
        .then( () => {
          return getEntryCount().then( dbEntryCount => {
            if ( !_.isNil( entryCount ) ) {
              dbEntryCount.should.be.equal( entryCount, 'number of entries saved to database is as expected' );
            }
            if ( !_.isNil( minEntryCount ) ) {
              dbEntryCount.should.be.least( minEntryCount, 'number of entries saved to database is at least the minimun expectation' );
            }
            if ( !_.isNil( maxEntryCount ) ) {
              dbEntryCount.should.be.most( maxEntryCount, 'number of entries saved to database is at most the maximum expectation' );
            }
          } )
        } )
        .then( () => done(), error => done(error) );
    });
  });

  describe(`Clear Data ${namespace}`, function(){
    this.timeout(10000);

    before( function() {
      if ( buildIndex ) {
        return updateTestData();
      }
      else {
        this.skip();
      }
    } );

    it(`clear test data ${namespace}`, function( done ){
      clearTestData()
        .then( () => getEntryCount().should.eventually.equal( 0, `all ${namespace} entries are cleared from database` ) )
        .then( () => done(), error => done(error) );
    });
  });

  describe(`Search and Get ${namespace}`, function(){
    this.timeout(10000);

    if ( buildIndex ) {
      before(updateTestData);
      after(removeTestIndex);
    }

    it(`search entities ${namespace}`, function( done ){
      let promises = [];

      sampleEntityNames.forEach( entityName => {
        let lcName = entityName.toLowerCase();
        let ucName = entityName.toUpperCase();

        promises.push( searchEntity( lcName ), searchEntity( ucName ) );
      } );

      Promise.all( promises )
        .should.be.fulfilled
        .then( results => {
          sampleEntityNames.forEach( ( entityName, i ) => {
            let start = i * 2;
            let lcRes = results[ start ];
            let ucRes = results[ start + 1 ];

            expect(lcRes.length, `some ${entityName} data is found`).to.be.above(0);
            expect(lcRes, `search is case insensitive for ${entityName}`).to.deep.equal(ucRes);
          } );
        } )
        .then( () => done(), error => done(error) );
    });

    it(`get entity by id ${namespace}`, function( done ){
      let id = sampleEntityId;

      getEntity(id).should.be.fulfilled.
        then( res => {
          expect(res, 'Get query returns an entity').to.not.be.equal(null);
          expect(getEntityId( res ), 'Get query returns the expected entity').to.be.equal(id);
        } )
        .then( () => done(), error => done(error) );
    });
  });
}

export default DatasourceTest;
