const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const DatasourceTest = require('./datasource');
const { uniprot } = require('./util/datasource');
const { buildIndex } = require('./util/param');
const { UNIPROT_FILE_NAME, INPUT_PATH } = require('../src/server/config');

const getXmlEntries = () => {
  let filePath = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
  let xml = fs.readFileSync( filePath );
  let json = xmljs.xml2js(xml, {compact: true});
  let entries = _.get( json, ['uniprot', 'entry'] );

  return entries;
};

const getEntryId = entry => {
  let id = _.get( entry, [ 'accession', 0, '_text' ] );
  return id;
};

const namespace = 'uniprot';
const xmlEntries = buildIndex ? getXmlEntries() : [];
const sampleGeneId = buildIndex ? getEntryId( xmlEntries[ 0 ] ) : 'Q7LG56';
const entryCount = xmlEntries.length;
const sampleGeneNames = [ 'tp53', 'mdm2' ];
const datasource = uniprot;

let opts = { namespace, sampleGeneNames, sampleGeneId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
