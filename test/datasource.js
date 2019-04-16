import { expect, should } from './util/chai';
import xmljs from 'xml-js';
import fs from 'fs';
import _ from 'lodash';
import { db } from '../src/server/db';
import { forceDownload, maxSearchSize } from './util/param';

function DatasourceTest( opts ) {
  const { sampleEntityNames, sampleEntityId, datasource, namespace, entryCount, buildIndex } = opts;

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
      // loading test data may need a higher timeout
      // depending on the platform
      this.timeout(6000);

      updateTestData().should.be.fulfilled
        .then( () => indexExists().should.eventually.be.equal( true, 'index is created to load data' ) )
        .then( () => getEntryCount().should.eventually.equal( entryCount, 'all entries are saved to database' ) )
        .then( () => done(), error => done(error) );
    });
  });

  describe(`Clear Data ${namespace}`, function(){
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
    if ( buildIndex ) {
      before(updateTestData);
      after(removeTestIndex);
    }

    it(`search entities ${namespace}`, function( done ){
      let promises = [];

      sampleEntityNames.forEach( entityName => {
        let lcName = entityName.toLowerCase();
        let halfLength = Math.ceil( entityName.length / 2 );
        let halfName = entityName.substring( 0, halfLength );
        let ucName = entityName.toUpperCase();

        promises.push( searchEntity( lcName ), searchEntity( halfName ), searchEntity( ucName ) );
      } );

      Promise.all( promises )
        .should.be.fulfilled
        .then( results => {
          sampleEntityNames.forEach( ( entityName, i ) => {
            let start = i * 3;
            let lcRes = results[ start ];
            let halfRes = results[ start + 1 ];
            let ucRes = results[ start + 2 ];

            expect(lcRes.length, `some ${entityName} data is found`).to.be.above(0);
            expect(halfRes, `search results for half substring of it
              supersets search results for ${entityName}`).to.deep.include.members(lcRes);
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
