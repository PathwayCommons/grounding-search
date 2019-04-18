import xmljs from 'xml-js';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';

import DatasourceTest from './datasource';
import { chebi } from './util/datasource';
import { buildIndex } from './util/param';
import { config } from '../src/server/config';

const { CHEBI_FILE_NAME, INPUT_PATH } = config;
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

const namespace = 'chebi';
const xmlEntries = buildIndex ? getXmlEntries() : [];
const sampleEntityId = buildIndex ? getEntryId( xmlEntries[ 0 ] ) : 'CHEBI:53438';
const entryCount = xmlEntries.length;
const sampleEntityNames = [ 'keto' ];
const datasource = chebi;

let opts = { namespace, sampleEntityNames, sampleEntityId, entryCount, datasource, buildIndex };
DatasourceTest( opts );
