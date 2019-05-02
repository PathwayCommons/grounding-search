/** @module xml-parser */

import saxes from 'saxes';
import fs from 'fs';
import _ from 'lodash';

/**
 * Read xml file stream and consume input events as needed.
 * @param {string} filePath Path to the input file.
 * @param {string} rootTagName The name of the root tag for creating json objects.
 * @param {array} omitList The list of xml tags to omit.
 * @param {object} events Object that wraps the event functions to consume.
 * @param {Function} [events.onData] A function to be consumed with a parameter
 * representing a data json as they are obtained.
 * @param {Function} [events.onEnd] A function to be consumed when the parsing is
 * ended.
 */
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
      onData(topTag, stream);
    }

    tagStack.pop();
  };

  parser.onend = () => {
    onEnd(stream);
  };

  let stream = fs.createReadStream(filePath);

  stream.on('data', chunk => {
    parser.write(chunk);
  });

  stream.on('end', () => {
    parser.close();
  });

  return parser;
}

export default XmlParser;
