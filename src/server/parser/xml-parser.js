let saxes = require('saxes');
let fs = require('fs');
let _ = require('lodash');

function XmlParser(filePath, rootTagName, omitList = [], events) {
  let parser = new saxes.SaxesParser();

  let tagStack = [];
  let getTopTag = () => tagStack[tagStack.length - 1];
  let onData = events.onData || _.noop;
  let onEnd = events.onEnd || _.noop;
  let omitSet = new Set( omitList );

  const shouldStoreNode = node => {
    return !omitSet.has(node.name);
  };

  parser.onopentag = node => {
    let parent = getTopTag();
    let hasParent = parent != null;
    let { attributes, name } = node;

    if( shouldStoreNode(node) ){
      let parsedNode = {
        name,
        attributes,
        children: []
      };

      if( hasParent ){
        parent.children.push(parsedNode);
      }

      tagStack.push(parsedNode);
    }
  };

  parser.ontext = text => {
    let topTag = getTopTag();

    if( topTag == null ){ // omit if unstored
      return;
    }

    topTag.text = text;
  };

  parser.onclosetag = () => {
    let topTag = getTopTag();

    if( topTag == null ){ // omit if unstored
      return;
    }

    if( topTag.name === rootTagName ){
      onData(topTag);
    }

    tagStack.pop();
  };

  parser.onend = onEnd;

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
