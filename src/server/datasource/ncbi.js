const DelimitedParser = require('../parser/delimited-parser');
const _ = require('lodash');
const { INPUT_PATH, NCBI_FILE_NAME, NCBI_URL } = require('../config');
const { isSupportedOrganism } = require('./organisms');
const db = require('../db');
const path = require('path');
const download = require('./download');
const { updateEntriesFromFile } = require('./processing');
const { nthStrNode } = require('../util');

const FILE_PATH = path.join(INPUT_PATH, NCBI_FILE_NAME);
const ENTRY_NS = 'ncbi';
const ENTRY_TYPE = 'protein';
const NODE_DELIMITER = '\t';
const EMPTY_VALUE = '-';

const NODE_INDICES = Object.freeze({
  ORGANISM: 0,
  ID: 1,
  SYMBOL: 2,
  SYNONYMS: 4,
  DESCRIPTION: 8,
  NA_SYMBOL: 10,
  NA_FULL_NAME: 11,
  OTHER_DESIGNATORS: 13
});

const safeSplit = ( val, delimiter = '|' ) => {
  if ( !isValidValue( val ) ) {
    return [];
  }

  return val.split( delimiter );
};

const isValidValue = val => val != EMPTY_VALUE && !_.isNil( val );

const pushIfValid = ( arr, val ) => {
  if( isValidValue( val ) ){
    arr.push( val );
  }
};

const processEntry = entryLine => {
  let nodes = entryLine.split( NODE_DELIMITER );
  let namespace = ENTRY_NS;
  let type = ENTRY_TYPE;

  let organism = nodes[ NODE_INDICES.ORGANISM ];
  let id = nodes[ NODE_INDICES.ID ];
  let name = nodes[ NODE_INDICES.SYMBOL ];

  let synonyms = _.concat(
    safeSplit( nodes[ NODE_INDICES.SYNONYMS ] ),
    safeSplit( nodes[ NODE_INDICES.OTHER_DESIGNATORS ] )
  );

  [ NODE_INDICES.DESCRIPTION, NODE_INDICES.NA_SYMBOL, NODE_INDICES.NA_FULL_NAME ]
    .forEach( i => pushIfValid( synonyms, nodes[ i ] ) );

  return { namespace, type, id, organism, name, synonyms };
};

const includeEntry = entryLine => {
  let orgId = nthStrNode( entryLine, NODE_DELIMITER, NODE_INDICES.ORGANISM );
  return isSupportedOrganism(orgId);
};

const parseFile = (filePath, onData, onEnd) => {
  let hasHeaderLine = true;

  DelimitedParser( FILE_PATH, { onData, onEnd }, hasHeaderLine );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseFile, processEntry, includeEntry);

const update = function(forceIfFileExists){
  return download(NCBI_URL, NCBI_FILE_NAME, forceIfFileExists).then(updateFromFile);
};

const clear = function(){
  const refreshIndex = () => db.refreshIndex();
  return db.clearNamespace(ENTRY_NS).then( refreshIndex );
};

const search = function(searchString, from, size){
  return db.search( searchString, ENTRY_NS, from, size );
};

const get = function(id){
  return db.get( id, ENTRY_NS );
};

module.exports = { update, clear, search, get };
