/** @module ncbi */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, NCBI_FILE_NAME, NCBI_URL } from '../config';
import { db } from '../db';
import { seqPromise, normalizeName } from '../util';
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
const ROOT_FIELD = 'root';
const ORG_FIELD = 'organism';
const NS_FIELD = 'namespace';

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
    .then( () => mergeStrains() )
    .then(refreshIndex);
};

const mergeStrains = function(chunkSize = 500){
  let mergePerformed = false;

  const getNormalizedName = e => e && normalizeName( e.name );
  const getNormalizedNames = e => {
    return e && ( e.names || [ getNormalizedName( e ), getSingleSynonym( e ) ].filter( p => !_.isNil( p ) ) );
  };
  const getSingleSynonym = e => e && e.singleSynonym;
  let rootOrgIds = Object.values( ROOT_STRAINS );

  const handleRootOrg = rootOrgId => {

    const getFirstByProps = (must, should, mustExists, mustNotExists) => {
      const getFirst = res => res.length > 0 ? Promise.resolve(res[0]) : Promise.resolve(null);
      const size = 1;
      return searchByProps( must, should, mustExists, mustNotExists, size ).then( getFirst );
    };

    const searchByProps = (must, should, mustExists, mustNotExists, size) => {
      must[ NS_FIELD ] = ENTRY_NS;
      return db.searchByProps( must, should, mustExists, mustNotExists, size );
    };

    const searchRoot = entity => {
      let names = getNormalizedNames( entity );

      for ( let i = 0; i < names.length; i++ ) {
        let name = names[ i ];
        let bookedRootId = name && ( rootIdMap.get( name ) );

        if ( !_.isNil( bookedRootId ) ) {
          return db.get( bookedRootId, ENTRY_NS );
        }
      }

      let must = { [ROOT_FIELD]: true, [ORG_FIELD]: rootOrgId };
      let should = { names, singleSynonym: names, name: names };

      return getFirstByProps( must, should );
    };

    const bookRootPromotion = entry => {
      let names = getNormalizedNames( entry );
      names.forEach( n => rootIdMap.set( n, entry.id ) );
    };

    const promoteToRoot = ids => {
      if ( !_.isArray( ids ) ){
        ids = [ids];
      }

      if ( ids.length == 0 ) {
        return Promise.resolve();
      }

      let updates = ids.map( id => {
        return {
          id,
          updates: {
            [ORG_FIELD]: rootOrgId,
            [ROOT_FIELD]: true
          }
        };
      } );

      let refresh = false;
      return db.updateEntries( updates, ENTRY_NS, refresh );
    };

    let rootOrg = getOrganismById( rootOrgId );
    let descendantOrgIds = rootOrg.descendantIds;
    let updateMap = new Map();
    let ancestorById = new Map();
    let rootIdMap = new Map();
    let toRemoveIds = [];

    const updateDb = function(){
      const handleUpdate = () => {
        let chunk = [];

        if ( updateMap.size == 0 ) {
          return Promise.resolve();
        }

        updateMap.forEach( ( updates, id ) => {
          let ancestor = ancestorById.get( id );

          let ancestorIds = ancestor.ids || [];
          let ancestorNames = getNormalizedNames( ancestor );
          let ancestorOrganisms = ancestor.organisms || [ '' + ancestor.organism ];

          let names = _.uniq( _.concat( ancestorNames, ...updates.names ) );
          let synonyms = _.uniqBy( _.concat( ancestor.synonyms, ...updates.synonyms ), normalizeName );
          let ids = _.uniq( _.concat( '' + id, ancestorIds, ...updates.ids ) );
          let organisms = _.uniq( _.concat( '' + rootOrgId, ancestorOrganisms, updates.organisms ) );

          let mergedUpdates = { synonyms, ids, organisms, names };

          chunk.push( { id, ENTRY_NS, updates: mergedUpdates } );
        } );

        let refresh = false;
        let updateChunk = () => db.updateEntries( chunk, ENTRY_NS, refresh );

        let removeMergedDescendants = () => {
          return db.removeEntries( toRemoveIds, ENTRY_NS, refresh ).then( () => toRemoveIds = [] );
        };

        updateMap = new Map();
        ancestorById = new Map();
        return updateChunk().then( removeMergedDescendants );
      };

      const handleRootPromotion = () => {
        let ids = [ ...rootIdMap.values() ];
        rootIdMap = new Map();
        return promoteToRoot( ids );
      };

      const refreshIndex = () => db.refreshIndex();

      return handleRootPromotion().then( handleUpdate ).then( refreshIndex );
    };

    const registerUpdate = function( root, mergeFrom ){
      if ( root == null || mergeFrom == null ) {
        let error = new Error('A parameter is null in registerUpdate()!');
        throw error;
      }

      mergePerformed = true;

      let updates = updateMap.has( root.id ) ? updateMap.get( root.id )
        : { synonyms: [], ids: [], organisms: [], names: [] };

      updates.synonyms.push( mergeFrom.synonyms.concat( mergeFrom.name ) );
      updates.ids.push( [ mergeFrom.id ], mergeFrom.ids || [] );
      updates.organisms.push( mergeFrom.organism );
      toRemoveIds.push( mergeFrom.id );
      ancestorById.set( root.id, root );
      updateMap.set( root.id, updates );

      let mergeFromNames = getNormalizedNames( mergeFrom );

      mergeFromNames.forEach( n => {
        rootIdMap.set( n, root.id );
        updates.names.push( n );
      } );
    };

    const mergeEntities = () => {
      let must = { [ORG_FIELD]: [ rootOrgId, ...descendantOrgIds ] };
      let should = {};
      let mustNotExists = [ ROOT_FIELD ];
      let mustExists = [];
      const search = () => searchByProps( must, should, mustExists, mustNotExists, chunkSize );

      return search()
        .then( entries => {
          if ( entries.length == 0 ) {
            return Promise.resolve();
          }

          return seqPromise( entries, entry => {
            return searchRoot( entry ).then( root => {
              if ( root == null ) {
                return bookRootPromotion( entry );
              }
              else {
                return registerUpdate( root, entry );
              }
            });
          } ).then( () => updateDb().then( mergeEntities ) );
        } );
    };

    return mergeEntities();
  };

  return seqPromise( rootOrgIds, handleRootOrg )
    .then( () => {
      if ( !mergePerformed ) {
        return Promise.resolve();
      }

      const clearRoots = () => db.clearField( ROOT_FIELD, ENTRY_NS );
      const remerge = () => mergeStrains( chunkSize );

      return clearRoots().then( remerge );
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
