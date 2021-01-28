import { createWriteStream } from 'fs';
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
 */
class Zenodo {
  /**
   * Create a Zenodo.
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
  upload( ){
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

/**
 * Class ElasticDump
 *
 * Wrap the ElasticDump module {@link https://www.npmjs.com/package/elasticdump}
 * Here, separate files for each Elasticsearch type (analyzer, mapping, data) in the index (env `INDEX`)
 * will be created in the dump or expected in the restore, named accordingly: '<INDEX>_<type>.json'.
 * Env `ESDUMP_LOCATION` can be a file path or URL, terminated with a slash (e.g. './input/').
 */
class ElasticDump {
  /**
   * Create an ElasticDump.
   * @param {Object} datastore
   * @param {String} host
   * @param {String} index
   * @param {String} directory
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
   * dump
   * @param {}
   * @returns
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

      await this.datastore.upload( esdumpFilename );
      await this.run( cmd );
    }
  }

  /**
   * restore
   * @param {}
   * @returns
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
const elasticDump = new ElasticDump( datastore, ELASTICSEARCH_HOST, INDEX, ESDUMP_LOCATION );

const dumpEs = async op => {

  if( op == 'restore' ){
    await elasticDump.restore();
  }
};

export default dumpEs;
