/** @module ncbi */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, NCBI_FILE_NAME, NCBI_URL } from '../config';
import { db } from '../db';
import { seqPromise } from '../util';
import DelimitedParser from '../parser/delimited-parser';
import downloadFile from './download';
import { updateEntriesFromFile } from './processing';
import { getOrganismById } from './organisms';
import ROOT_STRAINS from './strains/root';

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
  let organismName = getOrganismById(organism).name;
  let id = nodes[ NODE_INDICES.ID ];
  let name = nodes[ NODE_INDICES.SYMBOL ];

  let synonyms = _.concat(
    safeSplit( nodes[ NODE_INDICES.SYNONYMS ] ),
    safeSplit( nodes[ NODE_INDICES.OTHER_DESIGNATORS ] )
  );

  [ NODE_INDICES.DESCRIPTION, NODE_INDICES.NA_SYMBOL, NODE_INDICES.NA_FULL_NAME ]
    .forEach( i => pushIfValid( synonyms, nodes[ i ] ) );

  return { namespace, type, id, organism, organismName, name, synonyms };
};

const includeEntry = () => true;

const parseFile = (filePath, onData, onEnd) => {
  let hasHeaderLine = true;

  DelimitedParser( FILE_PATH, { onData, onEnd }, hasHeaderLine );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseFile, processEntry, includeEntry);

/**
 * Downloads the 'ncbi' entities and stores them in the input file.
 * @returns {Promise} A promise that is resolved when the download is done.
 */
const download = function(){
  return downloadFile(NCBI_URL, NCBI_FILE_NAME);
};

/**
 * Update the 'ncbi' entities in the index from the input file.
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
    .then(mergeStrains)
    .then(refreshIndex);
};

const mergeStrains = function(){
  let rootOrgIds = Object.values( ROOT_STRAINS );

  return seqPromise( rootOrgIds, rootOrgId => {
    let rootOrg = getOrganismById( rootOrgId );
    let descendantOrgIds = rootOrg.descendantIds;
    let ancestorMap = new Map();
    let updateMap = new Map();
    let toRemoveIds = [];

    const findAncestor = function( descendantEntry ){
      let descendantName = descendantEntry.name;
      let from = 0;
      let size = 1;

      // check the cached results first
      if ( ancestorMap.has( descendantName ) ) {
        return Promise.resolve( ancestorMap.get( descendantName ) );
      }

      return db.searchByOrg( rootOrgId, ENTRY_NS, descendantName, from, size )
        .then( res => res.length == 0 ? null : res[ 0 ] )
        .then( ancestor => {
          ancestorMap.set( descendantName, ancestor );
          return ancestor;
        } );
    };

    const updateDb = function(){
      let CHUNK_SIZE = 1000;
      let chunk = [];
      let chunks = [];

      if ( updateMap.size == 0 ) {
        return Promise.resolve();
      }

      updateMap.forEach( ( updates, name ) => {
        let ancestor = ancestorMap.get( name );
        let { id } = ancestor;

        let synonyms = _.uniq( _.concat( ancestor.synonyms, ...updates.synonyms ) );
        let ids = _.uniq( _.concat( id, updates.ids ) );
        let organisms = _.uniq( _.concat( '' + ancestor.organism, updates.organisms ) );
        let organism = updates.organism;

        let mergedUpdates = { synonyms, ids, organisms, organism };
        if ( organism ) {
          mergedUpdates.organism = organism;
        }

        chunk.push( { id, ENTRY_NS, updates: mergedUpdates } );

        if ( chunk.length === CHUNK_SIZE ) {
          chunks.push( chunk );
          chunk = [];
        }
      } );

      if ( chunk.length > 0 ) {
        chunks.push( chunk );
      }

      let updateChunk = () => seqPromise( chunks, chunk => db.updateEntries( chunk, ENTRY_NS ) );

      let removeMergedDescendants = () => {
        return db.removeEntries( toRemoveIds, ENTRY_NS );
      };

      return updateChunk().then( removeMergedDescendants );
    };

    const registerUpdates = function( ancestors, descendants ){
      ancestors.forEach( ( ancestor, i ) => {
        let descendant = descendants[ i ];
        let updates = updateMap.has( descendant.name ) ?
          updateMap.get( descendant.name ) : { synonyms: [], ids: [], organisms: [] };

        if ( ancestor == null ) {
          let updatedAncestor = ancestorMap.get( descendant.name );
          if ( updatedAncestor == null ) {
            // the organism of descendant will be updated as the
            // organism of root so keep the old organism in the organisms list
            updates.organisms.push( descendant.organism );
            updates.organism = rootOrgId;
            descendant.organism = rootOrgId;

            ancestorMap.set( descendant.name, descendant );
          }
          else {
            ancestor = updatedAncestor;
          }
        }

        if ( ancestor != null ) {
          updates.synonyms.push( descendant.synonyms );
          updates.ids.push( descendant.id );
          updates.organisms.push( descendant.organism );
          toRemoveIds.push( descendant.id );
        }

        updateMap.set( descendant.name, updates );
      } );
    };

    const searchAndRegister = () => {
      let name = null;
      let from = null;
      let size = null;
      let scroll = '10s';
      const CHUNK_SIZE = 50;

      return db.searchByOrg( descendantOrgIds, ENTRY_NS, name, from, size, scroll )
        .then( descendantEntries => {
          if ( descendantEntries.length == 0 ) {
            return Promise.resolve();
          }

          let chunks = _.chunk( descendantEntries, CHUNK_SIZE );

          return seqPromise( chunks, chunk => {
            let promises = chunk.map( e => findAncestor( e ) );
            return Promise.all( promises )
              .then( ancestors => registerUpdates( ancestors, chunk ) );
          } );
        } );
    };

    return searchAndRegister().then( updateDb );
  } );
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

export const ncbi = { download, index, update, clear, search, get, mergeStrains };
