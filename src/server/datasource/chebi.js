/** @module chebi */

import path from 'path';
import _ from 'lodash';

import { INPUT_PATH, CHEBI_FILE_NAME, CHEBI_URL, DB_PREFIX_CHEBI, DB_NAME_CHEBI } from '../config';
import { db } from '../db';
import XmlParser from '../parser/xml-parser';

import downloadFile from './download';
import { updateEntriesFromFile }  from './processing';

const FILE_PATH = path.join(INPUT_PATH, CHEBI_FILE_NAME);
const ENTRY_NS = 'chebi';
const ENTRY_TYPE = 'chemical';

const isNonNil = x => !_.isNil(x);

const XML_TAGS = Object.freeze( {
  RDF: 'rdf:RDF',
  CLASS: 'owl:Class',
  ID: 'oboInOwl:id',
  NAME: 'rdfs:label',
  IUPAC_NAME: 'oboInOwl:hasExactSynonym',
  SYNONYM: 'oboInOwl:hasRelatedSynonym',
  INCHI: 'chebi:inchi',
  INCHIKEY: 'chebi:inchikey',
  MASS: 'chebi:mass',
  FORMULA: 'chebi:formula',
  CHARGE: 'chebi:charge',
  MONOISOTOPIC_MASS: 'chebi:monoisotopicmass',
  DEPRECATED: 'owl:deprecated',
  ONTOLOGY: 'owl:Ontology',
  ANNOTATION_PROPERTY: 'owl:AnnotationProperty',
  OBJECT_PROPERTY: 'owl:ObjectProperty',
  AXIOM: 'owl:Axiom',
  SUMMARY: 'obo:IAO_0000115'
} );

const safeParseFloat = n => n != null ? parseFloat(n) : null;

const safeGetAsFloat = ( entry, fieldName ) => {
  let val = findChild( entry, fieldName );
  return safeParseFloat( val );
};

const isDeprecated = entry => {
  let deprecated = findChild( entry, XML_TAGS.DEPRECATED );
  return deprecated == 'true';
};

const findChild = ( entry, fieldName ) => {
  let child = _.find( entry.children, [ 'name', fieldName ] );
  return child && child.text;
};

const filterChildren = ( entry, fieldName ) => {
  return _.filter( entry.children, [ 'name', fieldName ] ).map( child => child.text );
};

const processEntry = entry => {
  let namespace = ENTRY_NS;
  let type = ENTRY_TYPE;

  const dbName = DB_NAME_CHEBI;
  const dbPrefix = DB_PREFIX_CHEBI;
  let id = findChild( entry, XML_TAGS.ID ).replace('CHEBI:', '');
  let name = findChild( entry, XML_TAGS.NAME );
  let inchi = findChild( entry, XML_TAGS.INCHI );
  let inchiKey = findChild( entry, XML_TAGS.INCHIKEY );
  let synonyms = _.concat(
    filterChildren( entry, XML_TAGS.SYNONYM ),
    filterChildren( entry, XML_TAGS.IUPAC_NAME )
  ).filter( isNonNil );
  let charge = safeGetAsFloat( entry, XML_TAGS.CHARGE );
  let mass = safeGetAsFloat( entry, XML_TAGS.MASS );
  let monoisotopicMass = safeGetAsFloat( entry, XML_TAGS.MONOISOTOPIC_MASS );
  let formulae = filterChildren( entry, XML_TAGS.FORMULA );
  let summary = findChild( entry, XML_TAGS.SUMMARY );

  return { namespace, type, dbName, dbPrefix, id, name, inchi, inchiKey, synonyms,
    charge, mass, monoisotopicMass, formulae, summary };
};

const includeEntry = entry => {
  return !isDeprecated( entry ) && entry.children.length && _.isString( findChild( entry, XML_TAGS.ID ) );
};

const parseXml = (filePath, onData, onEnd) => {
  let rootTag = XML_TAGS.CLASS;
  let omitList = [ XML_TAGS.ONTOLOGY, XML_TAGS.ANNOTATION_PROPERTY,
    XML_TAGS.OBJECT_PROPERTY, XML_TAGS.AXIOM ];

  XmlParser( filePath, rootTag, omitList, { onEnd, onData } );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseXml, processEntry, includeEntry);

/**
 * Index the existing 'chebi' entities file.
 * @returns A promise that resolves when the input file is indexed.
 */
const index = function(){
  return updateFromFile();
};

/**
 * Downloads the 'chebi' entities and stores them in the input file.
 * @returns {Promise} A promise that resolves when the input file is downloaded.
 */
const download = function(){
  return downloadFile(CHEBI_URL, CHEBI_FILE_NAME);
};

/**
 * Downloads and updates the 'chebi' entitites.
 * @returns {Promise} A promise that resolves when the input file is downloaded and indexed.
 */
const update = function(){
  return download().then(updateFromFile);
};

/**
 * Clear any entity whose namespace is 'chebi'.
 * @returns {Promise} A promise that resolves when clearing is done.
 */
const clear = function(){
  const refreshIndex = () => db.refreshIndex();
  return db.clearNamespace(ENTRY_NS).then( refreshIndex );
};

/**
 * Retrieve the entities matching best with the search string.
 * @param {string} searchString Key string for searching the best matching entities.
 * @returns {Promise} Promise object represents the array of best matching entities from 'chebi'.
 */
const search = function(searchString){
  return db.search( searchString, ENTRY_NS );
};

/**
 * Retrieve the entity that has the given id.
 * @param {string} id The id of entity to search
 * @returns {Promise} Promise objects represents the entity with the given id from 'chebi',
 * if there is no such entity it represents null.
 */
const get = function(id){
  return db.get( id, ENTRY_NS );
};

export const chebi = { download, index, update, clear, search, get };
