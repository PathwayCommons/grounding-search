/** @module processing */
import Future from 'fibers/future';
import _ from 'lodash';

import { db } from '../db';
import logger from '../logger';

const ENTRIES_CHUNK_SIZE = 100;

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

    // n.b. skip if empty chunk
    const insertChunk = chunk => chunk.length === 0 ? Promise.resolve() : db.insertEntries( chunk, false );

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

      let process = processChunk(chunk, processEntry).then(insertChunk);

      processes.push(process);

      process.then(() => _.pull(processes, process));

      return process;
    };

    const consumeEntry = entry => {
      if ( includeEntry(entry) ){
        enqueueEntry(entry);
      }
    };

    const onData = consumeEntry;

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
