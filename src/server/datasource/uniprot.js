const fs = require('fs');
const XmlStream = require('xml-stream');
const _ = require('lodash');
const { UNIPROT_INDEX, INPUT_PATH, UNIPROT_FILE_NAME, UNIPROT_URL } = require('../config');
const db = require('../db');
const path = require('path');
const download = require('./download');

const FILE_PATH = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
const ENTRY_NS = 'protein';
const ENTRY_TYPE = 'uniprot';

const SUPPORTED_ORGANISMS = new Set(['9606', '10090', '4932', '7227',
  '83333', '6239', '3702', '10116', '7955']);

const pushIfNonNil = ( arr, val ) => {
  if( val ){
    arr.push( val );
  }
};

const getShortOrFullName = n => getShortName( n ) || getFullName( n );
const getShortName = n => _.get(n, ['shortName', 0, '$text']) || _.get(n, ['shortName', 0]);
const getFullName = n => _.get(n, ['fullName', 0, '$text']) || _.get(n, ['fullName', 0]);

const processEntry = function(entry) {
  let namespace = ENTRY_NS;
  let type = ENTRY_TYPE;
  let id = _.get( entry, [ 'accession', 0 ] );
  let name = _.get( entry, 'name' );
  let organism = _.get( entry, [ 'organism', 'dbReference', '$', 'id' ] );
  let geneNames = _.get( entry, [ 'gene', 'name' ], [] ).map( res => res['$text'] );
  let recProtName = _.get( entry, [ 'protein', 'recommendedName' ] );
  let recFullProteinName = getFullName( recProtName );
  let recShortProteinName = getShortName( recProtName );
  let altProteinNames = _.get( entry, [ 'protein', 'alternativeName' ], [] ).map( getShortOrFullName );
  let subProteinNames = _.get( entry, [ 'protein', 'submittedName' ], [] ).map( getShortOrFullName );

  let proteinNames = [];
  pushIfNonNil( proteinNames, recShortProteinName );
  pushIfNonNil( proteinNames, recFullProteinName );
  altProteinNames.forEach( name => pushIfNonNil( proteinNames, name ) );
  subProteinNames.forEach( name => pushIfNonNil( proteinNames, name ) );

  // since uniprot uses weird names, use the first "protein name" instead, if possible
  name = proteinNames[0] || name;

  return { namespace, type, id, organism, name, geneNames, proteinNames };
};

const updateFromFile = function(){
  return new Promise( resolve => {
    let stream = fs.createReadStream(FILE_PATH);
    let xml = new XmlStream(stream);
    let entries = [];

    let toCollectList = [ 'gene > name', 'alternativeName', 'submittedName',
      'accession', 'fullName', 'shortName' ];

    toCollectList.forEach( toCollect => {
      xml.collect( toCollect );
    } );

    xml.on('endElement: entry', function(rawEntry) {
      // consider only the supported organisms
      if ( SUPPORTED_ORGANISMS.has( rawEntry.organism.dbReference.$.id ) ){
        let entry = processEntry( rawEntry );
        entries.push( entry );
      }
    });

    xml.on('end', function() {
      let recreateIndex = () => db.recreateIndex( UNIPROT_INDEX );
      let fillIndex = () => db.insertEntries( UNIPROT_INDEX, entries, true );

      recreateIndex( UNIPROT_INDEX )
        .then( fillIndex )
        .then( resolve );
    });
  } );
};

const update = function(forceIfFileExists){
  return download(UNIPROT_URL, UNIPROT_FILE_NAME, forceIfFileExists).then(updateFromFile);
};

const clear = function(){
  return db.deleteIndex( UNIPROT_INDEX );
};

const search = function(searchString, from, size){
  return db.search( UNIPROT_INDEX, searchString, from, size );
};

const get = function(id){
  return db.get( UNIPROT_INDEX, id );
};

module.exports = { update, clear, search, get };
