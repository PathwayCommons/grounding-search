/** @module medline */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, MEDLINE_URL, MEDLINE_FILE_NAME, DB_PREFIX_MEDLINE, DB_NAME_MEDLINE } from '../config';
import { db } from '../db';
import DelimitedParser from '../parser/delimited-parser';
import downloadFile from './download';
import { updateEntriesFromFile } from './processing';

const FILE_PATH = path.join(INPUT_PATH, MEDLINE_FILE_NAME);
const ENTRY_NS = DB_PREFIX_MEDLINE;
const ENTRY_TYPE = 'journal';
const NODE_DELIMITER = '\n';
const EMPTY_VALUE = '';

// List of All Journals Cited in PubMed - https://www.nlm.nih.gov/bsd/serfile_addedinfo.html
const NODE_INDICES = Object.freeze({
  JrId: 0,
  JournalTitle: 1,
  MedAbbr: 2,
  ISSN_Print: 3,
  ISSN_Online: 4,
  IsoAbbr: 5,
  NlmId: 6
});

const getValue = ( line, delimiter = ':' ) => {
  if ( !isValidEntry( line ) ) {
    return null;
  }
  const entry = line.split( delimiter ).map( s => s.trim() );
  return _.nth( entry, 1 );
};

const isValidEntry = line => line != EMPTY_VALUE;

const processEntry = entryLine => {
  let nodes = entryLine.split( NODE_DELIMITER );

  const namespace = ENTRY_NS;
  const type = ENTRY_TYPE;
  const dbName = DB_NAME_MEDLINE;
  const dbPrefix = DB_PREFIX_MEDLINE;
  const id = getValue( nodes[ NODE_INDICES.NlmId ] );
  const name = getValue( nodes[ NODE_INDICES.JournalTitle ] );
  // MedAbbr is a short form of the full journal title; it is assigned whether the title is a MEDLINE journal or not.
  // ISO Abbreviations are constructed at NLM to assist NCBI in linking from GenBank to PubMed.
  const synonyms = _.uniq(
    [
      NODE_INDICES.MedAbbr,
      NODE_INDICES.IsoAbbr
    ].map( s => getValue( nodes[s] ) )
  );

  // Format: 'ISSN (Print): [\d{4}-\d{4}]?' or 'ISSN (Online): [\d{4}-\d{4}]?'
  // resolver https://urn.issn.org/ e.g. https://portal.issn.org/resource/ISSN/0008-0810
  const dbXrefs = [
    {
      db: 'issn',
      type: 'print',
      id: getValue( nodes[ NODE_INDICES.ISSN_Print ] )
    },
    {
      db: 'issn',
      type: 'electronic',
      id: getValue( nodes[ NODE_INDICES.ISSN_Online ] )
    }
  ];

  return { namespace, type, dbName, dbPrefix, id, name, synonyms, dbXrefs };
};

const includeEntry = () => true;

const parseFile = (filePath, onData, onEnd) => {
  let hasHeaderLine = true;

  const matcher = /-{50,}\r?\n/;
  DelimitedParser( FILE_PATH, { onData, onEnd }, hasHeaderLine, matcher );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseFile, processEntry, includeEntry);

/**
 * Downloads the 'ncbi' entities and stores them in the input file.
 * @returns {Promise} A promise that is resolved when the download is done.
 */
const download = function(){
  return downloadFile(MEDLINE_URL, MEDLINE_FILE_NAME);
};

/**
 * Update the 'ncbi' entities
 * @returns {Promise} A promise that is resolved when the indexing is done.
 */
const index = function(){
  return updateFromFile();
};

/**
 * Update the 'ncbi' entitites from the input file.
 * @returns {Promise} A promise that is resolved when downloading and indexing are done.
 */
const update = function(){
  const refreshIndex = () => db.refreshIndex();
  return download()
    .then(index)
    // disable merging at index time for now and just clean up aggregate search results
    // .then(mergeStrains)
    .then(refreshIndex);
};

/**
 * Clear any entity whose namespace is 'ncbi'.
 * @returns {Promise} A promise that resolves when the index is cleared.
 */
const clear = function(){
  const refreshIndex = () => db.refreshIndex();
  return db.clearNamespace(ENTRY_NS).then( refreshIndex );
};

/**
 * Retrieve the entities matching best with the search string.
 * @param {string} searchString Key string for searching the best matching entities.
 * @returns {Promise} Promise object represents the array of best matching entities from 'ncbi'.
 */
const search = function(searchString){
  return db.search( searchString, ENTRY_NS );
};

/**
 * Retrieve the entity that has the given id.
 * @param {string} id The id of entity to search
 * @returns {Promise} Promise objects represents the entity with the given id from 'ncbi',
 * if there is no such entity it represents null.
 */
const get = function(id){
  return db.get( id, ENTRY_NS );
};

export const medline = { download, index, update, clear, search, get };
