/** @module ncbi */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, NCBI_FILE_NAME, NCBI_URL, DB_PREFIX_NCBI_PROTEIN, DB_PREFIX_NCBI_GENE, DB_NAME_NCBI_GENE, DB_NAME_NCBI_PROTEIN } from '../config';
import { db } from '../db';
import { seqPromise } from '../util';
import DelimitedParser from '../parser/delimited-parser';
import downloadFile from './download';
import { updateEntriesFromFile, updateEntriesFromSource } from './processing';
import { getOrganismById, isSupportedOrganism } from './organisms';
import ROOT_STRAINS from './strains/root';
import { eSearchSummaries } from './eutils';
import { omissions } from '../db/patches';

const FILE_PATH = path.join(INPUT_PATH, NCBI_FILE_NAME);
const ENTRY_NS = 'ncbi';
const ENTRY_TYPE = 'ggp';
const NODE_DELIMITER = '\t';
const EMPTY_VALUE = '-';
const DEFAULT_SCROLL = '10s';
const TAX_ID_SARSCOV2 = '2697049';

const NODE_INDICES = Object.freeze({
  ORGANISM: 0,
  ID: 1,
  SYMBOL: 2,
  SYNONYMS: 4,
  DB_XREFS: 5,
  DESCRIPTION: 8,
  TYPE_OF_GENE: 9,
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
  const dbName = DB_NAME_NCBI_GENE;
  const dbPrefix = DB_PREFIX_NCBI_GENE;
  let id = nodes[ NODE_INDICES.ID ];
  let name = nodes[ NODE_INDICES.SYMBOL ];

  let synonyms = _.concat(
    safeSplit( nodes[ NODE_INDICES.SYNONYMS ] ),
    safeSplit( nodes[ NODE_INDICES.OTHER_DESIGNATORS ] )
  );

  // Format: db:id | ... | db:id
  // NB: IDs may contain colons
  let dbXrefs = safeSplit( nodes[ NODE_INDICES.DB_XREFS ] ).map( xref => {
    let [ db, id ] = xref.split( /:(.+)/ );
    return { db, id };
  });

  let typeOfGene = nodes[ NODE_INDICES.TYPE_OF_GENE ];

  [ NODE_INDICES.DESCRIPTION, NODE_INDICES.NA_SYMBOL, NODE_INDICES.NA_FULL_NAME ]
    .forEach( i => pushIfValid( synonyms, nodes[ i ] ) );

  return { namespace, type, dbName, dbPrefix, id, organism, organismName, name, synonyms, dbXrefs, typeOfGene };
};

const includeEntry = entryLine => {
  // assume org is first tab-delimited entry
  const i = 0;
  const j = entryLine.indexOf(NODE_DELIMITER);
  const orgId = entryLine.substring(i, j);

  return isSupportedOrganism(orgId);
};

const parseFile = (filePath, onData, onEnd) => {
  let hasHeaderLine = true;

  DelimitedParser( FILE_PATH, { onData, onEnd }, hasHeaderLine );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseFile, processEntry, includeEntry);

const updateOrganismProteins = tax_id => {
  const opts = {
    term: `txid${tax_id}[Organism:noexp] AND refseq[filter]`
  };

  const processEntry = entry => {
    const namespace = ENTRY_NS;
    const type = 'protein';
    const dbName = DB_NAME_NCBI_PROTEIN;
    const dbPrefix = DB_PREFIX_NCBI_PROTEIN;
    const id = _.get( entry, 'uid' );
    const organism = _.get( entry, 'taxid' );
    const organismName = getOrganismById( organism ).name;
    const name = _.get( entry, 'title' );
    const synonyms = [];
    const dbXrefs = [];
    const typeOfGene = 'protein-coding';
    return { namespace, type, dbName, dbPrefix, id, organism, organismName, name, synonyms, dbXrefs, typeOfGene };
  };

  const parse = eSummaryResponse => {
    const result = _.get( eSummaryResponse, ['result'] );
    const uids = _.get( result, ['uids'] );
    return uids.map( uid => _.get( result, uid ) );
  };

  const includeEntry = () => true;
  const omittedUids = _.get( _.find( omissions, [ 'tax_id', TAX_ID_SARSCOV2 ] ), 'uids' );
  const includeEntryWrtOmissions = entry => !_.includes( omittedUids, entry.uid );

  return eSearchSummaries( opts )
    .then( data => updateEntriesFromSource( ENTRY_NS, data, parse, processEntry, includeEntry, includeEntryWrtOmissions ) );
};

/**
 * Downloads the 'ncbi' entities and stores them in the input file.
 * @returns {Promise} A promise that is resolved when the download is done.
 */
const download = function(){
  return downloadFile(NCBI_URL, NCBI_FILE_NAME);
};

/**
 * Update the 'ncbi' entities
 * @returns {Promise} A promise that is resolved when the indexing is done.
 */
const index = function(){
  return Promise.all([
    updateFromFile(),
    updateOrganismProteins( TAX_ID_SARSCOV2 )
  ]);
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

const mergeStrains = function(){
  const getEntryName = e => e && e.name.toLowerCase();
  const getSingleSynonym = e => {
    if ( e && e.synonyms && e.synonyms.length == 1 ) {
      return e.synonyms[ 0 ].toLowerCase();
    }

    return undefined;
  };
  let rootOrgIds = Object.values( ROOT_STRAINS );

  return seqPromise( rootOrgIds, rootOrgId => {
    let rootOrg = getOrganismById( rootOrgId );
    let descendantOrgIds = rootOrg.descendantIds;
    let rootMap = new Map();
    let updateMap = new Map();
    let toRemoveIds = [];

    const findAncestor = function( descendantEntry ){
      let descendantName = getEntryName( descendantEntry );
      return Promise.resolve( rootMap.get( descendantName ) );
    };

    const updateDb = function(){
      let CHUNK_SIZE = 1000;
      let chunk = [];
      let chunks = [];

      if ( updateMap.size == 0 ) {
        return Promise.resolve();
      }

      updateMap.forEach( ( updates, name ) => {

        if ( !rootMap.has( name ) ) {
          return Promise.resolve();
        }

        let ancestor = rootMap.get( name );
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

    const registerUpdates = function( roots, mergeFromLists ){
      roots.forEach( ( root, i ) => {
        let mergeFromList = mergeFromLists[ i ];

        if ( mergeFromList.length == 0 ) {
          let error = new Error('mergeFromList must not be empty!');
          throw error;
        }

        let name = getEntryName( mergeFromList[ 0 ] );
        let updates = updateMap.has( name ) ? updateMap.get( name )
          : { synonyms: [], ids: [], organisms: [] };

        if ( root == null ) {
          let updatedRoot = rootMap.get( name );
          if ( updatedRoot == null ) {
            if ( mergeFromList.length != 1 ) {
              let error = new Error('if root is null then mergeFromList must include a single entry which will be converted to a root!');
              throw error;
            }

            let descendant = mergeFromList[ 0 ];

            // the organism of descendant will be updated as the
            // organism of root so keep the old organism in the organisms list
            updates.organisms.push( descendant.organism );
            updates.organism = rootOrgId;
            descendant.organism = rootOrgId;

            rootMap.set( name, descendant );
          }
          else {
            root = updatedRoot;
          }
        }

        if ( root != null ) {
          updates.synonyms.push( ...mergeFromList.map( e => e.synonyms ) );
          updates.ids.push( ...mergeFromList.map( e => e.id ) );
          updates.organisms.push( ...mergeFromList.map( e => e.organism ) );
          toRemoveIds.push( ...mergeFromList.map( e => e.id ) );
        }

        updateMap.set( name, updates );
      } );
    };

    const searchAndRegisterRoots = () => {
      let name = null;
      let from = null;
      let size = null;
      let scroll = DEFAULT_SCROLL;

      return db.searchByOrg( rootOrgId, ENTRY_NS, name, from, size, scroll )
        .then( rootEntries => {
          if ( rootEntries.length == 0 ) {
            return Promise.resolve();
          }

          let rootsByName = _.groupBy( rootEntries, e => getEntryName( e ) );
          let rootsBySingleSynonym = _.groupBy( rootEntries, e => getSingleSynonym( e ) );
          // merging roots is originally based on the root names but extend that
          // behaviour by considering the single synonyms with the help of
          // this map
          let appendToByName = new Map();
          // exclude some entities from merge list by name because they are to
          // be merged into another root caused by their single synonyms
          let excludeByName = new Map();
          // keeps track of where entries are merged to because of their single synonyms
          let singleSynonymMergeRefs = new Map();
          let rootNames = Object.keys( rootsByName );
          let singleSynonyms = Object.keys( rootsBySingleSynonym );

          const findAppendToName = synonym => {
            let appendToName = synonym;
            if ( singleSynonymMergeRefs.has( appendToName ) ) {
              appendToName = singleSynonymMergeRefs.get( appendToName );
            }
            return appendToName;
          };

          singleSynonyms.forEach( synonym => {
            let appendToName = findAppendToName( synonym );
            if ( rootsByName[ appendToName ] ) {
              if ( !appendToByName.has( appendToName ) ) {
                appendToByName.set( appendToName, [] );
              }

              let matchingEnts = rootsBySingleSynonym[ synonym ];
              let extendedEnts = _.flattenDeep( matchingEnts.map( e => rootsByName[ getEntryName( e ) ] ) );

              appendToByName.get( appendToName ).push( ...extendedEnts );

              extendedEnts.forEach( ent => {
                const excludeFrom = n => {
                  if ( !excludeByName.has( n ) ) {
                    excludeByName.set( n, [] );
                  }

                  excludeByName.get( n ).push( ent.id );
                };

                let name = getEntryName( ent );
                let appendToName = findAppendToName( name );
                if ( appendToName != name ) {
                  excludeFrom( appendToName );
                }
              } );

              let matchingNames = _.uniq( matchingEnts.map( e => getEntryName( e ) ) );
              matchingNames.forEach( entryName => {
                // handle circular single synonym references
                if ( entryName == appendToName ) {
                  return;
                }

                singleSynonymMergeRefs.set( entryName, appendToName );
                if ( appendToByName.has( entryName ) ) {
                  let matchingAppendTo = appendToByName.get( entryName );
                  appendToByName.get( appendToName ).push( ...matchingAppendTo );
                  appendToByName.delete( entryName );
                  matchingAppendTo.forEach( e => {
                    singleSynonymMergeRefs.set( getEntryName( e ), appendToName );
                  } );
                }
              } );
            }
          } );

          return seqPromise( rootNames, name => {
            // safer to use the clone of array here
            let rootsForName = rootsByName[ name ].slice(0);

            let appendToName = findAppendToName( name );
            if ( name && name != appendToName ) {
              return Promise.resolve();
            }

            if ( appendToByName.has( name ) ) {
              rootsForName.push( ...appendToByName.get( name ) );
            }

            if ( excludeByName.has( name ) ) {
              let omitIds = excludeByName.get( name );
              _.remove( rootsForName, r => _.includes( omitIds, r.id ) );
            }

            if ( rootsForName.length == 0 ) {
              return Promise.resolve();
            }

            // the entries that comes from appendToByName may cause duplications
            rootsForName = _.uniqBy( rootsForName, e => e.id );

            let mergeInto = rootsForName[ 0 ];
            let mergeFromList = rootsForName.slice( 1 );

            rootMap.set( name, mergeInto );

            if ( mergeFromList.length === 0 ){
              return Promise.resolve();
            }

            return registerUpdates( [ mergeInto ], [ mergeFromList ] );
          } );
        } );
    };

    const searchAndRegisterDescendants = () => {
      let name = null;
      let from = null;
      let size = null;
      let scroll = DEFAULT_SCROLL;
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
              .then( ancestors => registerUpdates( ancestors, chunk.map( c => [ c ] ) ) );
          } );
        } );
    };

    const searchAndRegister = () => {
      return searchAndRegisterRoots().then( searchAndRegisterDescendants );
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
