let saxes = require('saxes');
let fs = require('fs');

function XmlParser(filePath, events) {
  let parser = new saxes.SaxesParser();

  const listenToEvent = ( name, callback ) => {
    parser[name] = callback;
  };

  for ( let eventName in events ) {
    listenToEvent( eventName, events[ eventName ] );
  }

  let stream = fs.createReadStream(filePath);

  stream.on('data', chunk => {
    parser.write(chunk);
  });

  stream.on('end', () => {
    parser.close();
  });

  return parser;
}

module.exports = XmlParser;
