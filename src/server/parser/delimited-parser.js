/** @module delimited-parser */

import split from 'split';
import fs from 'fs';
import _ from 'lodash';

/**
 * Read line delimited file stream and consume input events as needed.
 * @param {string} filePath Path to the input file.
 * @param {object} events Object that wraps the event functions to consume.
 * @param {Function} [events.onData] A function to be consumed with a parameter
 * representing a data line as they are obtained.
 * @param {Function} [events.onHeader] A function to be consumed with a parameter
 * representinh the header line as it is obtained.
 * @param {Function} [events.onEnd] A function to be consumed when the parsing is
 * ended.
 * @param {boolean} hasHeaderLine Whether the data file starts with a line that
 * represents its header.
 */
function DelimitedParser( filePath, events, hasHeaderLine ){
  let onData = events.onData || _.noop;
  let onEnd = events.onEnd || _.noop;
  let onHeader = events.onHeader || _.noop;
  let firstLine = true;

  (
    fs.createReadStream(filePath)
      .pipe(split())
      .on('data', function(line) {
        if ( firstLine ) {
          firstLine = false;

          if ( hasHeaderLine ) {
            onHeader( line );
            return;
          }
        }

        onData( line );
      })
      .on('end', onEnd)
  );

}

export default DelimitedParser;
