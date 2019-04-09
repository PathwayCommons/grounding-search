const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const StringDecoder = require('string_decoder').StringDecoder;

const DatasourceTest = require('./datasource');
const { ncbi } = require('./util/datasource');
const { buildIndex } = require('./util/param');
const { NCBI_FILE_NAME, INPUT_PATH } = require('../src/server/config');
const { isSupportedOrganism } = require('../src/server/datasource/organisms');
const { nthStrNode } = require('../src/server/util');

const decoder = new StringDecoder('utf8');
const ORG_INDEX = 0;
const ID_INDEX = 1;
const LINE_DELIMITER = '\n';
const NODE_DELIMITER = '\t';

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
const sampleEntityNames = [ 'plag1', 'camkk2' ];
const datasource = ncbi;

let opts = { namespace, sampleEntityNames, sampleEntityId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
