const fs = require('fs');
const XmlStream = require('xml-stream');
const _ = require('lodash');
const { UNIPROT_INDEX, INPUT_PATH, UNIPROT_FILE_NAME, UNIPROT_URL } = require('../config');
const { isSupportedOrganism } = require('./organisms');
const db = require('../db');
const path = require('path');
const download = require('./download');
const logger = require('../logger');
const Future = require('fibers/future');

const FILE_PATH = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
const ENTRY_NS = 'protein';
const ENTRY_TYPE = 'uniprot';
const ENTRIES_CHUNK_SIZE = 100;

const pushIfNonNil = ( arr, val ) => {
  if( val ){
    arr.push( val );
  }
};

const getShortOrFullName = n => getShortName( n ) || getFullName( n );
const getShortName = n => _.get(n, ['shortName', 0, '$text']) || _.get(n, ['shortName', 0]);
const getFullName = n => _.get(n, ['fullName', 0, '$text']) || _.get(n, ['fullName', 0]);

const processEntry = entry => {
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

const processChunk = chunk => {
  let task = Future.wrap(function(chunk, next){ // code in this block runs in its own thread
    next( chunk.map(processEntry) );
  });

  return task(chunk).promise();
};

const updateFromFile = function(){
  return new Promise( resolve => {
    let stream = fs.createReadStream(FILE_PATH);
    let xml = new XmlStream(stream);
    let entries = [];
    let process = Promise.resolve();

    const insertChunk = chunk => db.insertEntries( UNIPROT_INDEX, chunk, true );

    const enqueueEntry = entry => {
      entries.push(entry);

      if( entries.length >= ENTRIES_CHUNK_SIZE ){
        return dequeueEntries();
      } else {
        return Promise.resolve();
      }
    };

    const dequeueEntries = () => {
      let chunk = entries;
      entries = [];

      process = process.then(() => processChunk(chunk)).then(insertChunk);

      return process;
    };

    let toCollectList = [ 'gene > name', 'alternativeName', 'submittedName',
      'accession', 'fullName', 'shortName' ];

    toCollectList.forEach( toCollect => {
      xml.collect( toCollect );
    } );

    xml.on('endElement: entry', function(rawEntry) {
      const orgId = _.get(rawEntry, ['organism', 'dbReference', '$', 'id']);

      // consider only the supported organisms
      if ( isSupportedOrganism( orgId ) ){
        enqueueEntry(rawEntry);
      }
    });

    logger.info(`Processing Uniprot data from ${FILE_PATH}`);

    xml.on('end', function() {
      dequeueEntries(); // last chunk might not be full

      logger.info('Updating index with processed Uniprot data');

      let recreateIndex = () => db.recreateIndex( UNIPROT_INDEX );

      recreateIndex( UNIPROT_INDEX )
        .then( () => process ) // wait for last chunk
        .then( () => logger.info('Finished updating Uniprot data') )
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
