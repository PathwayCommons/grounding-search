const BinarySplit = require('binary-split');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const _ = require('lodash');

const decoder = new StringDecoder('utf8');

function DelimitedParser( filePath, events, hasHeaderLine ){
  let linestream = new BinarySplit();
  let input = fs.createReadStream(filePath);
  let onData = events.onData || _.noop;
  let onEnd = events.onEnd || _.noop;
  let onHeader = events.onHeader || _.noop;
  let firstLine = true;

  linestream.on('data', function(chunk) {
    let line = decoder.write(chunk);

    if ( firstLine ) {
      if ( hasHeaderLine ) {
        onHeader( line );
      }

      firstLine = false;
      return;
    }

    onData( line );
  });

  linestream.on('end', onEnd);

  input.pipe(linestream);
}

module.exports = DelimitedParser;
