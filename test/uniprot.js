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
const { UNIPROT_INDEX, UNIPROT_FILE_NAME, INPUT_PATH } = require('../src/server/config');

// register chai plugin for promises
chai.use( chaiAsPromised );

const forceDownload = false;
const loadTestData = () => uniprot.update(forceDownload);
const clearTestData = () => uniprot.clear();
const indexExists = () => db.exists( UNIPROT_INDEX );
const getEntryCount = () => db.count( UNIPROT_INDEX );
const searchGene = geneName => uniprot.search( geneName );
const getGene = id => uniprot.get( id );

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

const xmlEntries = getXmlEntries();

describe('Load Data', function(){
  after( clearTestData );
  it('load test data', function( done ){
    // loading test data may need a higher timeout
    // depending on the platform
    this.timeout(6000);

    loadTestData().should.be.fulfilled
      .then( () => indexExists().should.eventually.be.equal( true, 'index is created to load data' ) )
      .then( () => getEntryCount().should.eventually.equal( xmlEntries.length, 'all entries are saved to database' ) )
      .then( () => done(), error => done(error) );
  });
});

describe('Clear Data', function(){
  before( loadTestData );

  it('clear test data', function( done ){
    clearTestData()
      .then( () => indexExists().should.eventually.be.equal( false, 'index is cleared' ) )
      .then( () => done(), error => done(error) );
  });
});

describe('Search and Get', function(){
  before(loadTestData);

  after(clearTestData);

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
    let firstEntry = xmlEntries[ 0 ];
    let id = getEntryId( firstEntry );

    getGene(id).should.be.fulfilled.
      then( res => {
        expect(res.length, 'Get query returns one gene').to.be.equal(1);
        expect( res[0].id, 'Get query returns the expected gene' ).to.be.equal(id);
      } )
      .then( () => done(), error => done(error) );
  });
});
