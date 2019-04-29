/** @module uniprot */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, UNIPROT_FILE_NAME, UNIPROT_URL } from '../config';
import { db } from '../db';
import XmlParser from '../parser/xml-parser';
import downloadFile from './download';
import { isSupportedOrganism } from './organisms';
import { updateEntriesFromFile } from './processing';

const FILE_PATH = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
const ENTRY_NS = 'uniprot';
const ENTRY_TYPE = 'protein';

const pushIfNonNil = ( arr, val ) => {
  if( val ){
    arr.push( val );
  }
};

const getShortOrFullName = n => getShortName( n ) || getFullName( n );

const getShortName = n => {
  let obj = n && _.find( n.children, [ 'name', 'shortName' ] );
  return getText( obj );
};

const getFullName = n => {
  let obj = n && _.find( n.children, [ 'name', 'fullName' ] );
  return getText( obj );
};

const getOrganism = entry => {
  let organism = _.find( entry.children, [ 'name', 'organism' ] );
  let dbReference = organism && _.find( organism.children, ['name', 'dbReference'] );
  return getAttributes( dbReference ).id;
};

const getAttributes = n => n && n.attributes;

const getText = n => n && n.text;

const processEntry = entry => {
  let namespace = ENTRY_NS;
  let type = ENTRY_TYPE;
  let id = getText( _.find( entry.children, [ 'name', 'accession' ] ) );
  let name = getText( _.find( entry.children, [ 'name', 'name' ] ) );
  let organism = getOrganism( entry );
  let gene = _.find( entry.children, [ 'name', 'gene' ] );
  let geneNames = gene && _.filter( gene.children, [ 'name', 'name' ] ).map( res => res['text'] );
  let protein = _.find( entry.children, [ 'name', 'protein' ] );
  let recProtName = protein && _.find( protein.children, [ 'name', 'recommendedName' ] );
  let recFullProteinName = getFullName( recProtName );
  let recShortProteinName = getShortName( recProtName );
  let altProteinNames = protein && _.filter( protein.children, ['name', 'alternativeName'] ).map( getShortOrFullName );
  let subProteinNames = protein && _.filter( protein.children, ['name', 'submittedName'] ).map( getShortOrFullName );

  let proteinNames = [];
  pushIfNonNil( proteinNames, recShortProteinName );
  pushIfNonNil( proteinNames, recFullProteinName );
  altProteinNames.forEach( name => pushIfNonNil( proteinNames, name ) );
  subProteinNames.forEach( name => pushIfNonNil( proteinNames, name ) );

  let synonyms = proteinNames.concat(geneNames);

  // since uniprot uses weird names, use the first "protein name" instead, if possible
  name = proteinNames[0] || name;

  return { namespace, type, id, organism, name, geneNames, proteinNames, synonyms };
};

const includeEntry = entry => {
  const orgId = getOrganism(entry);

  return isSupportedOrganism(orgId);
};

const parseXml = (filePath, onData, onEnd) => {
  let rootTag = 'entry';
  let omitList = ['uniprot' ,'lineage', 'reference', 'evidence'];

  XmlParser( filePath, rootTag, omitList, { onEnd, onData } );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseXml, processEntry, includeEntry);

/**
 * Downloads the 'uniprot' entities and stores them in the input file.
 * @returns {Promise} A promise that is resolved when the download is done.
 */
const download = function(){
  return downloadFile(UNIPROT_URL, UNIPROT_FILE_NAME);
};

/**
 * Update the 'uniprot' entities in the index from the input file.
 * @returns {Promise} A promise that is resolved when the indexing is done.
 */
const index = function(){
  return updateFromFile();
};

/**
 * Update the 'uniprot' entitites from the input file.
 * @returns {Promise}
 */
const update = function(){
  return download().then(index);
};

/**
 * Clear any entity whose namespace is 'uniprot'.
 * @returns {Promise}
 */
const clear = function(){
  const refreshIndex = () => db.refreshIndex();
  return db.clearNamespace(ENTRY_NS).then( refreshIndex );
};

/**
 * Retrieve the entities matching best with the search string.
 * @param {string} searchString Key string for searching the best matching entities.
 * @param {string} [from] Offset from the first result to fetch.
 * @param {number} [size] Maximum amount of hits to be returned.
 * @returns {Promise} Promise object represents the array of best matching entities from 'uniprot'.
 */
const search = function(searchString, from, size){
  return db.search( searchString, ENTRY_NS, from, size );
};

/**
 * Retrieve the entity that has the given id.
 * @param {string} id The id of entity to search
 * @returns {Promise} Promise objects represents the entity with the given id from 'uniprot',
 * if there is no such entity it represents null.
 */
const get = function(id){
  return db.get( id, ENTRY_NS );
};

export const uniprot = { download, index, update, clear, search, get };
