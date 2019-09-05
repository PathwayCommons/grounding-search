/** @module ncbi */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, NCBI_FILE_NAME, NCBI_URL, MAX_SEARCH_ES } from '../config';
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
    .then(mergeStrains)
    .then(refreshIndex);
};

const mergeStrains = function(){
  const getEntryName = e => e && e.name.toLowerCase();
  let rootOrgIds = Object.values( ROOT_STRAINS );

  return seqPromise( rootOrgIds, rootOrgId => {

    const getFirstByProps = (props, mustExists, mustNotExists) => {
      const getFirst = res => res.length > 0 ? Promise.resolve(res[0]) : Promise.resolve(null);
      const size = 1;
      return searchByProps( props, mustExists, mustNotExists, size ).then( getFirst );
    };

    const searchByProps = (props, mustExists, mustNotExists, size) => {
      props[ NS_FIELD ] = ENTRY_NS;
      return db.searchByProps( props, mustExists, mustNotExists, size );
    };

    const searchRoot = name => {
      let bookedRootId = markAsRootMap.get( 'name' ) || promoteToRootMap.get( 'name' );
      if ( !_.isNil( bookedRootId ) ) {
        return db.get( bookedRootId, ENTRY_NS );
      }

      return getFirstByProps( { name, [ROOT_FIELD]: true, [ORG_FIELD]: rootOrgId } );
    };

    const updateField = ( ids, field, val ) => {
      if ( !_.isArray( ids ) ) {
        ids = [ids];
      }

      let updates = ids.map( id => {
        return { id, updates: { [ field ]: val } };
      } );

      if ( updates.length == 0 ) {
        return Promise.resolve();
      }

      let refresh = false;
      return db.updateEntries( updates, ENTRY_NS, refresh );
    };

    const bookRootMarking = entry => {
      markAsRootMap.set( getEntryName( entry ), entry.id );
    };

    const bookRootPromotion = entry => {
      let name = getEntryName( entry );
      originalOrgMap.set( entry.id, entry.organism );
      promoteToRootMap.set( name, entry.id );
    };

    const markAsRoot = ids => {
      if ( !_.isArray( ids ) ){
        ids = [ids];
      }
      return updateField( ids, ROOT_FIELD, true );
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
    let markAsRootMap = new Map();
    let promoteToRootMap = new Map();
    let originalOrgMap = new Map();
    let toRemoveIds = [];
    let singleSynonymMergeRefs = new Map();

    const updateDb = function(){
      const handleUpdate = () => {
        let chunk = [];

        if ( updateMap.size == 0 ) {
          return Promise.resolve();
        }

        updateMap.forEach( ( updates, id ) => {
          let ancestor = ancestorById.get( id );
          let originalOrg = originalOrgMap.has( id ) ? '' + originalOrgMap.get( id ) : [];

          let ancestorIds = ancestor.ids || [];
          let synonyms = _.uniq( _.concat( ancestor.synonyms, ...updates.synonyms ) );
          let ids = _.uniq( _.concat( '' + id, ancestorIds, ...updates.ids ) );
          let organisms = _.uniq( _.concat( '' + ancestor.organism, originalOrg, updates.organisms ) );

          let mergedUpdates = { synonyms, ids, organisms };

          chunk.push( { id, ENTRY_NS, updates: mergedUpdates } );
        } );

        let refresh = false;
        let updateChunk = () => db.updateEntries( chunk, ENTRY_NS, refresh );

        let removeMergedDescendants = () => {
          return db.removeEntries( toRemoveIds, ENTRY_NS, refresh ).then( () => toRemoveIds = [] );
        };

        updateMap = new Map();
        ancestorById = new Map();
        originalOrgMap = new Map();
        return updateChunk().then( removeMergedDescendants );
      };

      const handleRootMarking = () => {
        let ids = [ ...markAsRootMap.values() ];
        markAsRootMap = new Map();
        return markAsRoot( ids );
      };

      const handleRootPromotion = () => {
        let ids = [ ...promoteToRootMap.values() ];
        promoteToRootMap = new Map();
        return promoteToRoot( ids );
      };

      const refreshIndex = () => db.refreshIndex();

      return handleRootMarking().then( handleRootPromotion ).then( handleUpdate ).then( refreshIndex );
    };

    const registerUpdate = function( root, mergeFrom ){
      if ( root == null || mergeFrom == null ) {
        let error = new Error('A parameter is null in registerUpdate()!');
        throw error;
      }

      let updates = updateMap.has( root.id ) ? updateMap.get( root.id )
        : { synonyms: [], ids: [], organisms: [] };

      updates.synonyms.push( mergeFrom.synonyms );
      updates.ids.push( [ mergeFrom.id ], mergeFrom.ids || [] );
      updates.organisms.push( mergeFrom.organism );
      toRemoveIds.push( mergeFrom.id );

      ancestorById.set( root.id, root );
      updateMap.set( root.id, updates );
    };

    const findMergeIntoName = entryName => {
      let mergeIntoName = entryName;

      while ( singleSynonymMergeRefs.has( mergeIntoName ) ) {
        mergeIntoName = singleSynonymMergeRefs.get( mergeIntoName );
      }

      return mergeIntoName;
    };

    const getSingleSynonym = e => {
      if ( e && e.synonyms && e.synonyms.length == 1 ) {
        return e.synonyms[ 0 ].toLowerCase();
      }

      return undefined;
    };

    const mergeRoots = () => {
      return mergeRootsByName().then( mergeRootsBySingleSynonym );
      // return mergeRootsByName().then( () => db.refreshIndex() ).then( mergeRootsBySingleSynonym );
    };

    const mergeRootsBySingleSynonym = () => {
      let size = MAX_SEARCH_ES;
      const search = scrollId => db.scrollSingleSynonymRoots( ENTRY_NS, rootOrgId, size, scrollId );
      const performMerge = () => {
        let chunkSize = 500;
        // names of the root entries who has single synonym
        let ssEntryNames = [ ...singleSynonymMergeRefs.keys() ];
        let chunks = _.chunk( ssEntryNames, chunkSize );

        return seqPromise( chunks, chunk => {
          return seqPromise( chunk, entryName => {
            let mergeIntoName = findMergeIntoName( entryName );
            let mergeIntoPromise = searchRoot( mergeIntoName );
            let entryPromise = searchRoot( entryName );

            return Promise.all( [ entryPromise, mergeIntoPromise ] )
              .then( ( [ entry, mergeInto ] ) => {
                return registerUpdate( mergeInto, entry );
              } );
          } ).then( updateDb );
        } );
      };

      const fillSingleSynonymMergeRefs = () => {
        return search()
          .then( res => {
            let rootEntries = res.hits;
            let scrollId = res.scrollId;

            if ( rootEntries.length == 0 ) {
              return Promise.resolve();
            }

            return seqPromise( rootEntries, entry => {
              let name = getEntryName( entry );
              let singleSynonym = getSingleSynonym( entry );
              // Actually the entries that is returned by search() must
              // be expected to have single synonym field. However, I suspect
              // that there would be unexpected cases related to elasticsearch
              // internal logic. Therefore, it is safer to make this check here.
              if ( _.isNil( singleSynonym ) ) {
                return Promise.resolve();
              }
              return searchRoot( singleSynonym ).then( ssRoot => {
                // pass the entries whose single synonym does not represented by an entry
                if ( ssRoot == null ) {
                  return Promise.resolve();
                }

                singleSynonymMergeRefs.set( name, singleSynonym );
                return Promise.resolve();
              } );
            } ).then( () => search( scrollId ) );
          } );
      };

      return fillSingleSynonymMergeRefs().then( performMerge );
    };

    const mergeRootsByName = () => {
      let chunkSize = 500;
      let props = { [ORG_FIELD]: rootOrgId };
      let mustNotExists = [ ROOT_FIELD ];
      let mustExists = [];
      const search = () => searchByProps( props, mustExists, mustNotExists, chunkSize );

      return search()
        .then( rootEntries => {
          if ( rootEntries.length == 0 ) {
            return Promise.resolve();
          }

          return seqPromise( rootEntries, entry => {
            let name = getEntryName( entry );
            return searchRoot( name ).then( root => {
              if ( root == null ) {
                return bookRootMarking( entry );
              }
              else {
                return registerUpdate( root, entry );
              }
            } );
          } ).then( () => updateDb().then( mergeRootsByName ) );
        } );
    };

    const mergeDescendants = () => {
      let chunkSize = 500;
      let props = { [ORG_FIELD]: descendantOrgIds };
      let mustNotExists = [ ROOT_FIELD ];
      let mustExists = [];
      const search = () => searchByProps( props, mustExists, mustNotExists, chunkSize );
      return search()
        .then( descendantEntries => {
          if ( descendantEntries.length == 0 ) {
            return Promise.resolve();
          }

          return seqPromise( descendantEntries, entry => {
            let name = getEntryName( entry );
            // find and use the eventual root name
            let mergeIntoName = findMergeIntoName( name );
            return searchRoot( mergeIntoName ).then( root => {
              if ( root == null ) {
                return bookRootPromotion( entry );
              }

              return registerUpdate( root, entry );
            } );
          } ).then( () => updateDb().then( mergeDescendants ) );
        } );
    };

    const merge = () => {
      return mergeRoots().then( mergeDescendants );
    };

    return merge();
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
