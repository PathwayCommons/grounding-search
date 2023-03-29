/** @module famplex */

import path from 'path';
import _ from 'lodash';
import csv from 'csvtojson';
import fs from 'fs';

import { INPUT_PATH, FAMPLEX_DIRNAME, FAMPLEX_URL, FAMPLEX_FILE_NAME } from '../config';
import { db } from '../db';
import downloadFile from './download';
import { updateEntriesFromSource } from './processing';
// import { getOrganismById, isSupportedOrganism } from './organisms';

const fsPromises = fs.promises;

const DIR_PATH = path.join( INPUT_PATH, FAMPLEX_DIRNAME );
const DATA_PATH = path.join( INPUT_PATH, FAMPLEX_FILE_NAME );
const FAMPLEX_ENTITY_FILE = 'entities.csv';
const FAMPLEX_SYNONYM_FILE = 'grounding_map.csv';
const FAMPLEX_XREFS_FILE = 'equivalences.csv';
const ENTRY_NS = 'FPLX';
// const ENTRY_TYPE = 'ggp';

const processEntry = entryLine => {
  return {};
  // let nodes = entryLine.split( NODE_DELIMITER );
  // let namespace = ENTRY_NS;
  // let type = ENTRY_TYPE;

  // let organism = nodes[ NODE_INDICES.ORGANISM ];
  // let organismName = getOrganismById(organism).name;
  // const dbName = DB_NAME_NCBI_GENE;
  // const dbPrefix = DB_PREFIX_NCBI_GENE;
  // let id = nodes[ NODE_INDICES.ID ];
  // let name = nodes[ NODE_INDICES.SYMBOL ];

  // let synonyms = _.concat(
  //   safeSplit( nodes[ NODE_INDICES.SYNONYMS ] ),
  //   safeSplit( nodes[ NODE_INDICES.OTHER_DESIGNATORS ] )
  // );

  // // Format: db:id | ... | db:id
  // // NB: IDs may contain colons
  // let dbXrefs = safeSplit( nodes[ NODE_INDICES.DB_XREFS ] ).map( xref => {
  //   let [ db, id ] = xref.split( /:(.+)/ );
  //   return { db, id };
  // });

  // let typeOfGene = nodes[ NODE_INDICES.TYPE_OF_GENE ];

  // [ NODE_INDICES.DESCRIPTION, NODE_INDICES.NA_SYMBOL, NODE_INDICES.NA_FULL_NAME ]
  //   .forEach( i => pushIfValid( synonyms, nodes[ i ] ) );

  // return { namespace, type, dbName, dbPrefix, id, organism, organismName, name, synonyms, dbXrefs, typeOfGene };
};

const parse = data => data;

const updateFromSource = data => updateEntriesFromSource(ENTRY_NS, data, parse, processEntry);

const extractEntities = async () => {
  const fname = path.join( DIR_PATH, FAMPLEX_ENTITY_FILE );
  const DEFAULT_ENTRY_FIELDS = {
    synonyms: [],
    dbXrefs: []
  };
  const assignDefaults = o => _.defaults( o, { name: o.id }, DEFAULT_ENTRY_FIELDS );
  return await csv({ noheader: true, headers: ['id'] })
    .fromFile( fname )
    .subscribe( assignDefaults );
};

const addSynonyms = async entities => {
  const fname = path.join(DIR_PATH, FAMPLEX_SYNONYM_FILE);
  const opts = {
    noheader: true,
    headers : [
      'synonym',
      'dbPrefix',
      'id',
      'column4',
      'column5',
      'column6',
      'column7'
    ],
    colParser: {
      'synonym': 'string',
      'dbPrefix': 'string',
      'id': 'string',
      'column4': 'omit',
      'column5': 'omit',
      'column6': 'omit',
      'column7': 'omit',
    }
  };
  const byNS = o => o.dbPrefix == ENTRY_NS;
  const byId = o => o.id;
  const setSynonyms = ( values, id ) => {
    const entitySynonyms = values.map( o => o.synonym );
    let entry = _.find( entities, [ 'id', id ] );
    _.set( entry, 'synonyms', entitySynonyms );
  };

  let synonyms = await csv(opts).fromFile( fname );
  synonyms = synonyms.filter( byNS );
  synonyms = _.groupBy( synonyms, byId );
  _.forEach( synonyms, setSynonyms );
};

const addXrefs = async entities => {
  const fname = path.join(DIR_PATH, FAMPLEX_XREFS_FILE);
  const opts = {
    noheader: true,
    headers : [
      'db',
      'xrefId',
      'id'
    ]
  };
  const byId = o => o.id;
  const setXrefs = ( values, id ) => {
    const dbXrefs = values.map( ({ db, xrefId }) => ({ db, id: xrefId }) );
    let entry = _.find( entities, [ 'id', id ] );
    _.set( entry, 'dbXrefs', dbXrefs );
  };

  let xrefs = await csv(opts).fromFile( fname );
  xrefs = _.groupBy( xrefs, byId );
  _.forEach( xrefs, setXrefs );
};

/**
 * Aggregate the required information from the following:
 *   - entities.csv: (FamPlex) entity IDs
 *   - grounding_map.csv: synonyms (subset)
 *   - equivalences.csv: dbXrefs (subset)
 */
const preProcess = async function() {
  let entities = await extractEntities();
  await addSynonyms( entities );
  await addXrefs( entities );
  return entities;
};

/**
 * Downloads the 'famplex' release (repository) and writes pre-processed JSON to file
 * @returns {Promise} A promise that is resolved when the download is done.
 */
const download = async function() {
  const toJsonFile = entities => fsPromises.writeFile( DATA_PATH, JSON.stringify( entities ) );
  return downloadFile(FAMPLEX_URL, FAMPLEX_DIRNAME)
    .then( preProcess )
    .then( toJsonFile );
};

/**
 * Update the 'famplex' entities
 * @returns {Promise} A promise that is resolved when the indexing is done.
 */
const index = function(){
  const fromJsonFile = () => fsPromises.readFile( DATA_PATH, { encoding: 'utf-8' } );
  return fromJsonFile()
    .then( updateFromSource );
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

export const famplex = { download, index, update, clear, search, get, preProcess };
