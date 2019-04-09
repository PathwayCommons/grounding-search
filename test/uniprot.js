const xmljs = require('xml-js');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const DatasourceTest = require('./datasource');
const { uniprot } = require('./util/datasource');
const { buildIndex } = require('./util/param');
const { UNIPROT_FILE_NAME, INPUT_PATH } = require('../src/server/config');
const { isSupportedOrganism } = require('../src/server/datasource/organisms');

const getXmlEntries = () => {
  let filePath = path.join(INPUT_PATH, UNIPROT_FILE_NAME);
  let xml = fs.readFileSync( filePath );
  let json = xmljs.xml2js(xml, {compact: true});
  let entries = _.get( json, ['uniprot', 'entry'] )
    .filter( hasSupportedOrganism );

  return entries;
};

const hasSupportedOrganism = entry => {
  let orgId = getEntryOrg( entry );
  return isSupportedOrganism( orgId );
};

const getEntryOrg = entry => {
  let org = _.get( entry, ['organism', 'dbReference', '_attributes', 'id'] );
  return org;
};

const getEntryId = entry => {
  let id = _.get( entry, [ 'accession', '_text' ] )
    || _.get( entry, [ 'accession', 0, '_text' ] );
  return id;
};

const namespace = 'uniprot';
const xmlEntries = buildIndex ? getXmlEntries() : [];
const sampleEntityId = buildIndex ? getEntryId( xmlEntries[ 0 ] ) : 'Q7LG56';
const entryCount = xmlEntries.length;
const sampleEntityNames = [ 'plag1', 'camkk2' ];
const datasource = uniprot;

let opts = { namespace, sampleEntityNames, sampleEntityId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
