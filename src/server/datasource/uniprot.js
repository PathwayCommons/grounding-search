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

const XML_TAGS = Object.freeze({
  UNIPROT: 'uniprot',
  ENTRY: 'entry',
  PROTEIN: 'protein',
  DB_REFERENCE: 'dbReference',
  ORGANISM: 'organism',
  ACCESSION: 'accession',
  NAME: 'name',
  GENE: 'gene',
  ALTERNATIVE_NAME: 'alternativeName',
  SUBMITTED_NAME: 'submittedName',
  RECOMMENDED_NAME: 'recommendedName',
  FULL_NAME: 'fullName',
  SHORT_NAME: 'shortName'
});

const UNSTORED_XML_TAGS = [XML_TAGS.UNIPROT];

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

    // TODO
    // const insertChunk = chunk => db.insertEntries( chunk, false );

    const insertChunk = chunk => {
      console.log('insertChunk', chunk);
    };

    const enqueueEntry = entry => {
      console.log('enqueue', entry);

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
      const orgId = null;

      // require('fs').writeFileSync('entry.json', JSON.stringify(entry, null, 2));

      // TODO
      // consider only the supported organisms
      // if ( isSupportedOrganism( orgId ) ){
        enqueueEntry(entry);
      // }
    };

    const shouldStoreNode = node => {
      return !UNSTORED_XML_TAGS.some(tag => tag === node.name);
    };

    const parseXml = () => {
      let tagStack = [];
      let top = () => tagStack[tagStack.length - 1];

      const onopentag = node => {
        let parent = top();
        let hasParent = parent != null;
        let { attributes, name } = node;

        let parsedNode = {
          name,
          attributes,
          children: []
        };

        if( shouldStoreNode(parsedNode) ){
          if( hasParent ){
            parent.children.push(parsedNode);
          }

          tagStack.push(parsedNode);
        }
      };

      const ontext = text => {
        let topTag = top();

        if( topTag == null ){ // omit if unstored
          return;
        }

        // omit if text is full of white spaces
        if ( /^\s*$/.test(text) ) {
          return;
        }

        topTag.text = text;
      };

      const onclosetag = node => {
        let topTag = top();

        if( topTag == null ){ // omit if unstored
          return;
        }

        if( topTag.name === XML_TAGS.ENTRY ){
          consumeEntry(topTag);
        }

        tagStack.pop();
      };

      const onend = () => {
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

      XmlParser( FILE_PATH, { onopentag, onclosetag, ontext, onend } );
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
