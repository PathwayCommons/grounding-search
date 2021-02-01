import _ from 'lodash';
import { createWriteStream, createReadStream, statSync } from 'fs';
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

/**
 * Wrap the Zenodo REST API {@link https://developers.zenodo.org/#quickstart-upload}
 * Enabling one to upload to or download files from Zenodo using the Files API.
 * Assumption is that there exists a Deposition (e.g. https://zenodo.org/api/deposit/depositions/<deposition_id>)
 * and that valid API authentication token and bucket uuid are in hand.
 */
class Zenodo {
  /**
   * Create a Zenodo.
   * @param {String} access_token Zenodo authentication token
   * @param {String} bucket_id Deposition bucket uuid
   * @param {String} dumpDirectory Local directory where files will be downloaded/uploaded from
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
   * Upload
   * PUT a file located in this.dumpDirectory in a Depositions bucket
   * @param {String} filename the name of the file to upload
   */
  async upload( filename ){
    const url = this.files_base_url + filename;
    const localPath = path.resolve( path.join( this.dumpDirectory, filename ) );
    const stats = statSync( localPath );
    const fileSizeInBytes = stats.size;
    const readStream = createReadStream( localPath );

    logger.info( `Uploading to ${url} from ${localPath}`);
    logger.info( `Size: ${fileSizeInBytes}` );
    const response = await fetch( url, {
      method: 'PUT',
      headers: _.defaults( {
        'Content-length': fileSizeInBytes
      }, this.default_headers ),
      body: readStream
    });
    if ( !response.ok ) throw new Error(`Error in response ${response.statusText}`);
    return response;
  }

  /**
   * download
   * GET a file from a Depositions bucket and save locally to this.dumpDirectory
   * @param {String} filename the file to download from bucket
   */
  async download( filename ){
    const url = this.files_base_url + filename;
    const localPath = path.resolve( path.join( this.dumpDirectory, filename ) );

    logger.info( `Downloading from ${url} to ${localPath}`);
    const response = await fetch( url, { headers: this.default_headers });
    if ( !response.ok ) throw new Error(`Error in response ${response.statusText}`);
    await streamPipeline( response.body, createWriteStream( localPath ) );
  }
}

/**
 * Class ElasticDump
 *
 * Wrap the elasticdump module {@link https://www.npmjs.com/package/elasticdump} and augment with
 * ability to upload to or download from a datastore. For each Elasticsearch type ('analyzer', 'mapping', 'data')
 * in the provided `index`, information is exported (imported) to (from) files located in `directory` ('<index>_<type>.json').
 * Files will be uploaded (downloaded) to (from) the datastore after (before) dump (restore).
 */
class ElasticDump {
  /**
   * Create an ElasticDump.
   * @param {String} host Elasticsearch instance host name
   * @param {String} index Elastissearch index name
   * @param {String} directory Local folder where files should be created or read from
   * @param {Object} datastore A datastore instance (i.e. Zenodo) with functions to upload(filename) / download( filename )
   */
  constructor( host, index, dumpDirectory, datastore, limit = 10000, overwrite = true ){
    this.indexUrl = `http://${host}/${index}`;
    this.dumpDirectory = dumpDirectory;
    this.ES_TYPES = new Set([
      'analyzer',
      'mapping',
      'data'
    ]);
    this.limit = limit;
    this.overwrite = overwrite;
    this.datastore = datastore;
  }

  async run( cmd ) {
    logger.info(`Running ${cmd}...`);
    const { stdout, stderr } = await execute( cmd );
    logger.info( stdout );
    logger.error( stderr );
  }

  /**
   * Export the Elasticsearch index ES_TYPES to individual files
   */
  async dump(){
    for( let type of this.ES_TYPES ) {
      const esdumpFilename = `${INDEX}_${type}.json`;
      const input = `${this.indexUrl}`;
      const output = `${this.dumpDirectory}${esdumpFilename}`;
      const cmd = [
        'elasticdump',
        `--input=${input}`,
        `--output=${output}`,
        `--type=${type}`,
        `--limit=${this.limit}`,
        `--overwrite=${this.overwrite}`
      ].join(' ');

      await this.run( cmd );
      await this.datastore.upload( esdumpFilename );
    }
  }

  /**
   * Import the Elasticsearch index ES_TYPES from files
   */
  async restore(){
    for( let type of this.ES_TYPES ) {
      const esdumpFilename = `${INDEX}_${type}.json`;
      const input = `${this.dumpDirectory}${esdumpFilename}`;
      const output = `${this.indexUrl}`;
      const cmd = [
        'elasticdump',
        `--input=${input}`,
        `--output=${output}`,
        `--type=${type}`,
        `--limit=${this.limit}`
      ].join(' ');

      await this.datastore.download( esdumpFilename );
      await this.run( cmd );
    }
  }
}

const datastore = new Zenodo( ZENODO_ACCESS_TOKEN, ZENODO_BUCKET_ID, ESDUMP_LOCATION );
const elasticDump = new ElasticDump( ELASTICSEARCH_HOST, INDEX, ESDUMP_LOCATION, datastore );

const dumpEs = async op => {

  switch( op ) {
  case 'restore':
    await elasticDump.restore();
    break;
  case 'dump':
    await elasticDump.dump();
    break;
  default:
    return;
  }
};

export default dumpEs;
