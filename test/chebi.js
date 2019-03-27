const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const DatasourceTest = require('./datasource');
const chebi = require('../src/server/datasource/chebi');
const { CHEBI_FILE_NAME, INPUT_PATH } = require('../src/server/config');

const RDF = 'rdf:RDF';
const CLASS = 'owl:Class';
const ID = 'oboInOwl:id';

const getXmlEntries = () => {
  let filePath = path.join(INPUT_PATH, CHEBI_FILE_NAME);
  let xml = fs.readFileSync( filePath );
  let json = xmljs.xml2js(xml, {compact: true});
  let entries = _.get( json, [ RDF, CLASS ] );

  return entries;
};

const getEntryId = entry => {
  let id = _.get( entry, [ ID, '_text' ] );
  return id;
};

const buildIndex = process.env.TESTS_BUILD_INDEX === 'true'
  || process.env.TESTS_BUILD_INDEX === 'TRUE';
const namespace = 'chebi';
const xmlEntries = buildIndex ? getXmlEntries() : [];
const sampleGeneId = buildIndex ? getEntryId( xmlEntries[ 0 ] ) : 'CHEBI:53438';
const entryCount = xmlEntries.length;
const sampleGeneNames = [ 'iron' ];
const datasource = chebi;

let opts = { namespace, sampleGeneNames, sampleGeneId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
