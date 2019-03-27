const Future = require('fibers/future');
const db = require('../db');
const logger = require('../logger');

const ENTRIES_CHUNK_SIZE = 100;

const processChunk = (chunk, processEntry) => {
  let task = Future.wrap(function(chunk, next){ // code in this block runs in its own thread
    let processedEntries = chunk.map(processEntry);
    let err = null;

    next( err, processedEntries );
  });

  return task(chunk).promise();
};

const updateEntriesFromFile = function(ns, filePath, parse, processEntry, includeEntry = () => true){
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

      process = process.then(() => processChunk(chunk, processEntry)).then(insertChunk);

      return process;
    };

    const consumeEntry = entry => {
      if ( includeEntry(entry) ){
        enqueueEntry(entry);
      }
    };

    const onData = consumeEntry;

    const onEnd = () => {
      dequeueEntries(); // last chunk might not be full

      logger.info(`Updating index with processed ${ns} data`);

      const manualRefresh = () => db.refreshIndex();

      process
        .then( () => logger.info(`Finished updating ${ns} data`) )
        .then( manualRefresh )
        .then( resolve );
    };

    const guaranteeIndex = () => db.guaranteeIndex();
    const clearNamespace = () => db.clearNamespace(ns);

    guaranteeIndex()
      .then( clearNamespace )
      .then( () => parse(filePath, onData, onEnd) );

    logger.info(`Processing ${ns} data from ${filePath}`);

  } );
};

module.exports = { updateEntriesFromFile };
