/** @module chebi */

import path from 'path';
import _ from 'lodash';

import { config } from '../config';
import { db } from '../db';
import XmlParser from '../parser/xml-parser';

import download from './download';
import { updateEntriesFromFile }  from './processing';

const { INPUT_PATH, CHEBI_FILE_NAME, CHEBI_URL } = config;
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
  AXIOM: 'owl:Axiom'
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

  let id = findChild( entry, XML_TAGS.ID );
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
  let formulae = findChild( entry, XML_TAGS.FORMULA );

  return { namespace, type, id, name, inchi, inchiKey, synonyms,
    charge, mass, monoisotopicMass, formulae };
};

const includeEntry = entry => {
  return !isDeprecated( entry );
};

const parseXml = (filePath, onData, onEnd) => {
  let rootTag = XML_TAGS.CLASS;
  let omitList = [ XML_TAGS.RDF, XML_TAGS.ONTOLOGY, XML_TAGS.ANNOTATION_PROPERTY,
    XML_TAGS.OBJECT_PROPERTY, XML_TAGS.AXIOM ];

  XmlParser( filePath, rootTag, omitList, { onEnd, onData } );
};

const updateFromFile = () => updateEntriesFromFile(ENTRY_NS, FILE_PATH, parseXml, processEntry, includeEntry);

/**
 * Update the 'chebi' entitites from the input file.
 * @param {boolean} [forceIfFileExists] Whether to dowload the input source file for 'chebi' 
 * even if a version of it already exists.
 * @returns {Promise}
 */
const update = function(forceIfFileExists){
  return download(CHEBI_URL, CHEBI_FILE_NAME, forceIfFileExists).then(updateFromFile);
};

/**
 * Clear any entity whose namespace is 'chebi'.
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
 * @returns {Promise} Promise object represents the array of best matching entities from 'chebi'.
 */
const search = function(searchString, from, size){
  return db.search( searchString, ENTRY_NS, from, size );
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

export const chebi = { update, clear, search, get };
