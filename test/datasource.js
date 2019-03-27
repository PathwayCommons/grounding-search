const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();
const chaiAsPromised = require('chai-as-promised');
const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const db = require('../src/server/db');

// register chai plugin for promises
chai.use( chaiAsPromised );

function DatasourceTest( opts ) {
  const { sampleGeneNames, sampleGeneId, datasource, namespace, entryCount, buildIndex } = opts;

  const forceDownload = false;
  const maxSearchSize = 10000;
  const updateTestData = () => datasource.update(forceDownload);
  const clearTestData = () => datasource.clear();
  const removeTestIndex = () => db.deleteIndex();
  const indexExists = () => db.exists();
  const getEntryCount = () => db.count( namespace );
  const searchGene = geneName => datasource.search( geneName, 0, maxSearchSize );
  const getGene = id => datasource.get( id );


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

    it(`search genes ${namespace}`, function( done ){
      let promises = [];

      sampleGeneNames.forEach( geneName => {
        let lcName = geneName.toLowerCase();
        let halfLength = Math.ceil( geneName.length / 2 );
        let halfName = geneName.substring( 0, halfLength );
        let ucName = geneName.toUpperCase();

        promises.push( searchGene( lcName ), searchGene( halfName ), searchGene( ucName ) );
      } );

      Promise.all( promises )
        .should.be.fulfilled
        .then( results => {
          sampleGeneNames.forEach( ( geneName, i ) => {
            let start = i * 3;
            let lcRes = results[ start ];
            let halfRes = results[ start + 1 ];
            let ucRes = results[ start + 2 ];

            expect(lcRes.length, `some ${geneName} data is found`).to.be.above(0);
            expect(halfRes, `search results for half substring of it
              supersets search results for ${geneName}`).to.deep.include.members(lcRes);
            expect(lcRes, `search is case insensitive for ${geneName}`).to.deep.equal(ucRes);
          } );
        } )
        .then( () => done(), error => done(error) );
    });

    it(`get gene by id ${namespace}`, function( done ){
      let id = sampleGeneId;

      getGene(id).should.be.fulfilled.
        then( res => {
          expect(res.length, 'Get query returns one gene').to.be.equal(1);
          expect( res[0].id, 'Get query returns the expected gene' ).to.be.equal(id);
        } )
        .then( () => done(), error => done(error) );
    });
  });
}

module.exports = DatasourceTest;
