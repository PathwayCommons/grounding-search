import fs from 'fs';
import { StringDecoder } from 'string_decoder';
import path from 'path';
import DatasourceTest from './datasource';
import { ncbi } from './util/datasource';
import { buildIndex } from './util/param';
import { NCBI_FILE_NAME, INPUT_PATH  } from '../src/server/config';
import { isSupportedOrganism } from '../src/server/datasource/organisms';

const decoder = new StringDecoder('utf8');
const ORG_INDEX = 0;
const ID_INDEX = 1;
const LINE_DELIMITER = '\n';
const NODE_DELIMITER = '\t';

/**
 * Returns the nth node in str, where the nodes are splited by the delimiter,
 * assuming that no adjacent occurance of the delimiter exists
 * @param {string} str String to seek the nth node.
 * @param {string} delimiter Delimiter that seperates the nodes.
 * @param {number} n Index of node to seek.
 */
const nthStrNode = ( str, delimiter, n ) => {
  let i = 0;
  let start = 0;
  while ( start != -1 && i < n ) {
    start = str.indexOf( delimiter, start ) + 1;
    i ++;
  }

  let end = str.indexOf( delimiter, start );

  // if there is no more occurance of the delimiter go until the end of str
  if ( end == -1 ) {
    end = undefined;
  }

  let node = str.substring( start, end );
  return node;
};

const getEntryLines = data => {
  let text = decoder.write( data );
  return text.split( LINE_DELIMITER )
    .filter( l => l.length > 0 )
    .slice( 1 )
    .filter( hasSupportedOrganism );
};

const hasSupportedOrganism = entryLine => {
  let orgId = getEntryOrg( entryLine );
  return isSupportedOrganism( orgId );
};

const getEntryNodes = entryLine => entryLine.split( NODE_DELIMITER );

const readEntryLines = () => {
  let filePath = path.join(INPUT_PATH, NCBI_FILE_NAME);
  let data = fs.readFileSync( filePath );
  let lines = getEntryLines( data );

  return lines;
};

const getEntryId = entryLine => {
  let id = nthStrNode( entryLine, NODE_DELIMITER, ID_INDEX );
  return id;
};

const getEntryOrg = entryLine => {
  let org = nthStrNode( entryLine, NODE_DELIMITER, ORG_INDEX );
  return org;
};

const namespace = 'ncbi';
const entryLines = buildIndex ? readEntryLines() : [];
const sampleEntityId = buildIndex ? getEntryId( entryLines[ 0 ] ) : '7157';
const entryCount = entryLines.length;
const sampleEntityNames = [ 'p53' ];
const datasource = ncbi;

let opts = { namespace, sampleEntityNames, sampleEntityId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
