/** @module processing */
import Future from 'fibers/future';
import _ from 'lodash';

import { db } from '../db';
import logger from '../logger';
import { CHUNK_SIZE, MAX_SIMULT_CHUNKS } from '../config';

const processChunk = (chunk, processEntry) => {
  let task = Future.wrap(function(chunk, next){ // code in this block runs in its own thread
    let processedEntries = chunk.map(processEntry);
    let err = null;

    next( err, processedEntries );
  });

  return task(chunk).promise();
};

/**
 * Update entries of a namespace based on an input file.
 * @param {string} ns The namespace whose entries will be updated.
 * @param {string} filePath Path of the file to read the entries from.
 * @param {function} parse  A function that will be called to parse the data file.
 * @param {function} processEntry A function that will be called to process entry data
 * before inserting it to database.
 * @param {function} [includeEntry = () => true] A function called to decide whether to include or omit an entry.
 */
const updateEntriesFromFile = function(ns, filePath, parse, processEntry, includeEntry = () => true){
  return new Promise( resolve => {
    let entries = [];
    let processes = [];
    let fileStream;

    // n.b. skip if empty chunk
    const insertChunk = chunk => {
      if( chunk.length === 0 ){
        return Promise.resolve();
      }

      return db.insertEntries( chunk, false ).then(res => {
        if( res.errors ){
          let err = new Error('A chunk failed to be inserted');

          err.chunk = chunk;
          err.response = res;

          throw err;
        }

        return res;
      });
    };

    const enqueueEntry = entry => {
      entries.push(entry);

      if( entries.length >= CHUNK_SIZE ){
        return dequeueEntries();
      } else {
        return Promise.resolve();
      }
    };

    const dequeueEntries = () => {
      let chunk = entries;
      entries = [];

      let process = processChunk(chunk, processEntry).then(insertChunk);

      processes.push(process);

      // when we have to many active processing operations, pause the input stream
      // so we don't build up too much memory
      if( processes.length >= MAX_SIMULT_CHUNKS ){
        fileStream.pause();
      }

      process.then(() => {
        _.pull(processes, process);

        // resume the input stream once we've decreased the active number of
        // processing operations
        if( processes.length < MAX_SIMULT_CHUNKS ){
          fileStream.resume();
        }
      });

      return process;
    };

    const consumeEntry = entry => {
      if ( includeEntry(entry) ){
        enqueueEntry(entry);
      }
    };

    const onData = (entry, dataFileStream) => {
      if( fileStream == null ){
        fileStream = dataFileStream;
      }

      consumeEntry(entry);
    };

    const onEnd = () => {
      logger.info(`Updating index with processed ${ns} data`);

      const manualRefresh = () => db.refreshIndex();

      Promise.all(processes)
        .then( dequeueEntries ) // last chunk might not be full
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

export { updateEntriesFromFile };
