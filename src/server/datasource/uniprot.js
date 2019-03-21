const XmlParser = require('../parser/xml-parser');
const _ = require('lodash');
const { INPUT_PATH, UNIPROT_FILE_NAME, UNIPROT_URL } = require('../config');
const { isSupportedOrganism } = require('./organisms');
const db = require('../db');
const path = require('path');
const download = require('./download');
const logger = require('../logger');
const Future = require('fibers/future');

const FILE_PATH = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
const ENTRY_NS = 'uniprot';
const ENTRY_TYPE = 'protein';
const ENTRIES_CHUNK_SIZE = 100;

const pushIfNonNil = ( arr, val ) => {
  if( val ){
    arr.push( val );
  }
};

const getShortOrFullName = n => getShortName( n ) || getFullName( n );

const getShortName = n => {
  let obj = n && _.find( n.children, [ 'name', 'shortName' ] );
  return getText( obj );
};

const getFullName = n => {
  let obj = n && _.find( n.children, [ 'name', 'fullName' ] );
  return getText( obj );
};

const getOrganism = entry => {
  let organism = _.find( entry.children, [ 'name', 'organism' ] );
  let dbReference = organism && _.find( organism.children, ['name', 'dbReference'] );
  return getAttributes( dbReference ).id;
};

const getAttributes = n => n && n.attributes;

const getText = n => n && n.text;

const processEntry = entry => {
  let namespace = ENTRY_NS;
  let type = ENTRY_TYPE;
  let id = getText( _.find( entry.children, [ 'name', 'accession' ] ) );
  let name = getText( _.find( entry.children, [ 'name', 'name' ] ) );
  let organism = getOrganism( entry );
  let gene = _.find( entry.children, [ 'name', 'gene' ] );
  let geneNames = gene && _.filter( gene.children, [ 'name', 'name' ] ).map( res => res['text'] );
  let protein = _.find( entry.children, [ 'name', 'protein' ] );
  let recProtName = protein && _.find( protein.children, [ 'name', 'recommendedName' ] );
  let recFullProteinName = getFullName( recProtName );
  let recShortProteinName = getShortName( recProtName );
  let altProteinNames = protein && _.filter( protein.children, ['name', 'alternativeName'] ).map( getShortOrFullName );
  let subProteinNames = protein && _.filter( protein.children, ['name', 'submittedName'] ).map( getShortOrFullName );

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
    let processedEntries = chunk.map(processEntry);
    let err = null;

    next( err, processedEntries );
  });

  return task(chunk).promise();
};

const updateFromFile = function(){
  return new Promise( resolve => {
    let entries = [];
    let process = Promise.resolve();

    const insertChunk = chunk => db.insertEntries( chunk, false );

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

    const consumeEntry = entry => {
      const orgId = getOrganism( entry );

      // consider only the supported organisms
      if ( isSupportedOrganism( orgId ) ){
        enqueueEntry(entry);
      }
    };

    const onEnd = () => {
      dequeueEntries(); // last chunk might not be full

      logger.info('Updating index with processed Uniprot data');

      const enableAutoRefresh = () => db.enableAutoRefresh();
      const manualRefresh = () => db.refreshIndex();

      process
        .then( () => logger.info('Finished updating Uniprot data') )
        .then( enableAutoRefresh )
        .then( manualRefresh )
        .then( resolve );
    };

    const parseXml = () => {
      let onData = consumeEntry;
      let rootTag = 'entry';
      let omitList = ['uniprot' ,'lineage', 'reference', 'evidence'];
      XmlParser( FILE_PATH, rootTag, omitList, { onEnd, onData } );
    };

    const guaranteeIndex = () => db.guaranteeIndex();
    const disableAutoRefresh = () => db.disableAutoRefresh();
    const clearNamespace = () => db.clearNamespace(ENTRY_NS);

    guaranteeIndex()
      .then( clearNamespace )
      .then( disableAutoRefresh )
      .then( parseXml );

    logger.info(`Processing Uniprot data from ${FILE_PATH}`);

  } );
};

const update = function(forceIfFileExists){
  return download(UNIPROT_URL, UNIPROT_FILE_NAME, forceIfFileExists).then(updateFromFile);
};

const clear = function(){
  const refreshIndex = () => db.refreshIndex();
  return db.clearNamespace(ENTRY_NS).then( refreshIndex );
};

const search = function(searchString, from, size){
  return db.search( searchString, ENTRY_NS, from, size );
};

const get = function(id){
  return db.get( id, ENTRY_NS );
};

module.exports = { update, clear, search, get };
