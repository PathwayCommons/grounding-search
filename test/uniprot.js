const chai = require('chai')
  , expect = chai.expect
  , should = chai.should();
const chaiAsPromised = require('chai-as-promised');
const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const uniprot = require('../src/server/datasource/uniprot');
const db = require('../src/server/db');
const { UNIPROT_FILE_NAME, INPUT_PATH } = require('../src/server/config');

const NS = 'uniprot';

// register chai plugin for promises
chai.use( chaiAsPromised );

const forceDownload = false;
const maxSearchSize = 10000;
const updateTestData = () => uniprot.update(forceDownload);
const clearTestData = () => uniprot.clear();
const removeTestIndex = () => db.deleteIndex();
const indexExists = () => db.exists();
const getEntryCount = () => db.count( NS );
const searchGene = geneName => uniprot.search( geneName, 0, maxSearchSize );
const getGene = id => uniprot.get( id );
const buildIndex = process.env.TESTS_BUILD_INDEX === 'true'
  || process.env.TESTS_BUILD_INDEX === 'TRUE';

const getXmlEntries = () => {
  let filePath = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
  let xml = fs.readFileSync( filePath );
  let json = xmljs.xml2js(xml, {compact: true});
  let entries = _.get( json, ['uniprot', 'entry'] );

  return entries;
};

const getEntryId = entry => {
  let id = _.get( entry, [ 'accession', 0, '_text' ] );
  return id;
};

const xmlEntries = buildIndex ? getXmlEntries() : null;

describe('Update Data', function(){
  before( function() {
    if ( !buildIndex ) {
      this.skip();
    }
  } );

  if ( buildIndex ) {
    after( removeTestIndex );
  }

  it('update test data', function( done ){
    // loading test data may need a higher timeout
    // depending on the platform
    this.timeout(6000);

    updateTestData().should.be.fulfilled
      .then( () => indexExists().should.eventually.be.equal( true, 'index is created to load data' ) )
      .then( () => getEntryCount().should.eventually.equal( xmlEntries.length, 'all entries are saved to database' ) )
      .then( () => done(), error => done(error) );
  });
});

describe('Clear Data', function(){
  before( function() {
    if ( buildIndex ) {
      return updateTestData();
    }
    else {
      this.skip();
    }
  } );

  it('clear test data', function( done ){
    clearTestData()
      .then( () => getEntryCount().should.eventually.equal( 0, 'all uniprot entries are cleared from database' ) )
      .then( () => done(), error => done(error) );
  });
});

describe('Search and Get', function(){
  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  it('search genes', function( done ){
    let promiseTP53 = searchGene('tp53');
    let promiseTP = searchGene('tp');
    let promiseMDM2 = searchGene('mdm2');
    let promiseMD = searchGene('md');
    let promiseTP53uc = searchGene('TP53');

    Promise.all( [ promiseTP53, promiseTP, promiseMDM2, promiseMD, promiseTP53uc ] )
      .should.be.fulfilled
      .then( ( [resTP53, resTP, resMDM2, resMD, resTP53uc] ) => {
        expect(resTP53.length, 'some tp53 data is found').to.be.above(0);
        expect(resMDM2.length, 'some mdm2 data is found').to.be.above(0);
        expect(resTP53, 'search is case insensitive').to.deep.equal(resTP53uc);
        expect(resTP, 'search results for tp supersets tp53').to.deep.include.members(resTP53);
        expect(resMD, 'search results for md supersets mdm2').to.deep.include.members(resMDM2);
      } )
      .then( () => done(), error => done(error) );
  });

  it('get gene by id', function( done ){
    let id = xmlEntries ? getEntryId( xmlEntries[ 0 ] ) : 'Q7LG56';

    getGene(id).should.be.fulfilled.
      then( res => {
        expect(res.length, 'Get query returns one gene').to.be.equal(1);
        expect( res[0].id, 'Get query returns the expected gene' ).to.be.equal(id);
      } )
      .then( () => done(), error => done(error) );
  });
});
