import _ from 'lodash';
// import {
//   promises as fsPromise
// } from 'fs';
import { createWriteStream } from 'fs';
// import ndjson from 'ndjson';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import fetch from 'node-fetch';
import util from 'util';
import { exec } from 'child_process';
import logger from '../logger';
import {
  INDEX,
  ESDUMP_LOCATION,
  ZENODO_BASE_URL,
  ZENODO_BUCKET_ID,
  ZENODO_ACCESS_TOKEN,
  ELASTICSEARCH_HOST
} from '../config';

const execute = util.promisify( exec );
const streamPipeline = promisify( pipeline );

const checkHTTPStatus = response => {
  const { statusText, status, ok } = response;
  if ( !ok ) {
    throw new Error( `${statusText} (${status})`, status, statusText );
  }
  return response;
};

/**
 * Helper class to wrap the Zenodo REST API {@link https://developers.zenodo.org/#quickstart-upload}
 */
class Zenodo {
  /**
   * Create an Zenodo.
   * @param {String} access_token The access_token
   * @param {String} bucket_id The bucket_id
   * @param {String} dumpDirectory The dumpDirectory
   */
  constructor( access_token, bucket_id, dumpDirectory ){
    this.files_base_url = `${ZENODO_BASE_URL}api/files/${bucket_id}/`;
    this.default_headers = {
      'User-Agent': `${process.env.npm_package_name}/${process.env.npm_package_version}`,
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/json'
    };
    this.dumpDirectory = dumpDirectory;
  }

  /**
   * TODO
   * @param {String} filename
   * @returns
   */
  upload( filename ){
  }

  /**
   * download
   * @param {String} filename the file to download from bucket
   * @returns a Promise
   */
  async download( filename ){
    const url = this.files_base_url + filename;
    const downloadPath = path.resolve( path.join( this.dumpDirectory, filename ) );

    logger.info( `Downloading from ${url} to ${downloadPath}`);
    const response = await fetch( url, { headers: this.default_headers });
    if ( !response.ok ) throw new Error(`Error in response ${response.statusText}`);
    await streamPipeline( response.body, createWriteStream( downloadPath ) );
  }
}

const zenodo = new Zenodo( ZENODO_ACCESS_TOKEN, ZENODO_BUCKET_ID, ESDUMP_LOCATION );

/**
 * dumpEs
 * A light wrapper around elasticsearch-dump {@link https://github.com/elasticsearch-dump/elasticsearch-dump}
 * Here, separate files for each Elasticsearch type (analyzer, mapping, data) in the index (env `INDEX`)
 * will be created in the dump or expected in the restore, named accordingly: '<INDEX>_<type>.json'.
 * Env `ESDUMP_LOCATION` can be a file path or URL, terminated with a slash (e.g. './input/').
 *
 * @param {String} op Enum 'dump' or 'restore'
 */
const dumpEs = async op => {

  // const ES_TYPES = new Set(['analyzer', 'mapping', 'data']); // note order
  const ES_TYPES = new Set([
    'analyzer',
    'mapping',
    'data'
  ]); // note order
  const esdump_limit = 10000;
  const esdump_overwrite = true;
  const indexUrl = `http://${ELASTICSEARCH_HOST}/${INDEX}`;

  for( let type of ES_TYPES ) {
    logger.info(`Performing elasticsearch ${op} for ${INDEX} ${type}...`);

    const esdumpFilename = `${INDEX}_${type}.json`;
    const esdumpPath = `${ESDUMP_LOCATION}${esdumpFilename}`;
    const input = op === 'dump' ? indexUrl : esdumpPath;
    const output = op === 'dump' ? esdumpPath : indexUrl;

    const cmd = [
      'elasticdump',
      `--input=${input}`,
      `--output=${output}`,
      `--type=${type}`,
      `--limit=${esdump_limit}`,
      `--overwrite=${esdump_overwrite}`
    ].join(' ');

    await zenodo.download( esdumpFilename );

    logger.info( cmd );
    const opts = {};
    const { stdout, stderr } = await execute( cmd, opts );
    logger.info( stdout );
    logger.error( stderr );
  }
};

export default dumpEs;
