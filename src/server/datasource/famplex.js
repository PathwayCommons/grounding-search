/** @module famplex */

import path from 'path';
import _ from 'lodash';
import csv from 'csvtojson';
import fs from 'fs';

import {
  INPUT_PATH,
  FAMPLEX_DIRNAME,
  DB_NAME_FAMPLEX,
  DB_PREFIX_FAMPLEX,
  FAMPLEX_URL,
  FAMPLEX_FILE_NAME,
  DB_PREFIX_UNIPROT_KNOWLEDGEBASE,
  DB_NAME_HGNC_SYMBOL,
  DB_PREFIX_HGNC_SYMBOL,
  DB_NAME_UNIPROT_KNOWLEDGEBASE,
  FAMPLEX_TYPE_FILTER
} from '../config';
import { db } from '../db';
import downloadFile from './download';
import { updateEntriesFromSource } from './processing';
import { getOrganismById } from './organisms';

const fsPromises = fs.promises;

const DIR_PATH = path.join( INPUT_PATH, FAMPLEX_DIRNAME );
const DATA_PATH = path.join( INPUT_PATH, FAMPLEX_FILE_NAME );
const FAMPLEX_ENTITY_FILE = 'entities.csv';
const FAMPLEX_SYNONYM_FILE = 'grounding_map.csv';
const FAMPLEX_XREFS_FILE = 'equivalences.csv';
const FAMPLEX_SUMMARIES_FILE = 'descriptions.csv';
const FAMPLEX_RELATIONS_FILE = 'relations.csv';
const ENTRY_NS = DB_PREFIX_FAMPLEX;
const ENTRY_TYPE_COMPLEX = 'namedComplex';
const ENTRY_TYPE_FAMILY = 'protein';
const ENTRY_ORGANISM = '9606';

const TYPE_MAP = Object.freeze({
  'isa': ENTRY_TYPE_FAMILY,
  'partof': ENTRY_TYPE_COMPLEX
});

const SOURCE_DB_MAP = Object.freeze({
  'HGNC': { name: DB_NAME_HGNC_SYMBOL, dbPrefix: DB_PREFIX_HGNC_SYMBOL },
  'FPLX': { name: DB_NAME_FAMPLEX, dbPrefix: DB_PREFIX_FAMPLEX },
  'UP': { name: DB_NAME_UNIPROT_KNOWLEDGEBASE, dbPrefix: DB_PREFIX_UNIPROT_KNOWLEDGEBASE }
});

const processEntry = entry => {
  const namespace = ENTRY_NS;
  const organism = ENTRY_ORGANISM;
  const organismName = getOrganismById(organism).name;
  const dbName = DB_NAME_FAMPLEX;
  const dbPrefix = DB_PREFIX_FAMPLEX;

  return { ...entry, namespace, dbName, dbPrefix, organism, organismName };
};

// Entity type inclusion is configurable (protein [aka 'family'], 'complex', 'all' [default])
const includeEntry = entry => {
  if ( FAMPLEX_TYPE_FILTER === 'all' || entry.type === FAMPLEX_TYPE_FILTER ) {
    return true;
  } else {
    return false;
  }
};
const parse = data => data;
const updateFromSource = data => updateEntriesFromSource(ENTRY_NS, data, parse, processEntry, includeEntry);

const extractEntities = async () => {
  const fname = path.join( DIR_PATH, FAMPLEX_ENTITY_FILE );
  const DEFAULT_ENTRY_FIELDS = {
    synonyms: [],
    dbXrefs: [],
    type: ENTRY_TYPE_FAMILY
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
  const byNS = o => o.dbPrefix.toLowerCase() == ENTRY_NS;
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

const addSummaries = async entities => {
  const fname = path.join(DIR_PATH, FAMPLEX_SUMMARIES_FILE);
  const opts = {
    noheader: true,
    headers : [
      'id',
      'xref',
      'summary'
    ]
  };
  const setSummary = ({ id, summary }) => {
    let entry = _.find( entities, [ 'id', id ] );
    _.set( entry, 'summary', summary );
  };

  let summaries = await csv(opts).fromFile( fname );
  summaries.forEach( setSummary );
};

/**
 * Set the entity 'type' and related properties
 *
 * There are two (not neccessarily mutually exclusive) types: (a) complex and (b) family.
 * Each type has related properties:
 *   - complex
 *     - components: A set of entities, possibly of type family
 *   - family
 *     - members: A set of entities, possibly of type complex
 *
 * @param {Object[]} entities  - The Famplex entities
 */
const addType = async entities => {

  // Related to source file
  const fname = path.join(DIR_PATH, FAMPLEX_RELATIONS_FILE);
  const opts = {
    noheader: true,
    headers : [
      'subjectNs',
      'subject',
      'predicate',
      'fplxNs',
      'id'
    ]
  };
  let relations = await csv(opts).fromFile( fname );

  // Related to type
  const setType = ({ subjectNs, subject, predicate, id }) => {
    const entry = _.find( entities, [ 'id', id ] );
    const entryType = entry.type;

    let type = TYPE_MAP[predicate];
    const isComplex = type === ENTRY_TYPE_COMPLEX;

    if( isComplex ){
      // Complex will have "componentXrefs"
      if( !_.has( entry, 'componentXrefs' ) ) entry.componentXrefs = [];

      // Always initialize or overwrite type
      _.set( entry, 'type', type );

      entry.componentXrefs.push({
        dbName: SOURCE_DB_MAP[subjectNs].name,
        dbPrefix: SOURCE_DB_MAP[subjectNs].dbPrefix,
        id: subject
      });

    } else {
      if( _.isUndefined( entryType ) ) _.set( entry, 'type', type );
      // Family, will have "memberXrefs"
      if( !_.has( entry, 'memberXrefs' ) ) entry.memberXrefs = [];

      entry.memberXrefs.push({
        dbName: SOURCE_DB_MAP[subjectNs].name,
        dbPrefix: SOURCE_DB_MAP[subjectNs].dbPrefix,
        id: subject
      });
    }

  };

  relations.forEach( setType );
};

/**
 * Aggregate the required information from the following:
 *   - entities.csv: (FamPlex) entity IDs
 *   - grounding_map.csv: synonyms (subset)
 *   - equivalences.csv: dbXrefs (subset)
 *   - relations.csv: family members and complex components
 */
const preProcess = async function() {
  let entities = await extractEntities();
  await addSynonyms( entities );
  await addXrefs( entities );
  await addSummaries( entities );
  await addType( entities );
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
  const toObjects = d => JSON.parse(d);
  return fromJsonFile()
    .then( toObjects )
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