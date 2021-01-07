import util from 'util';
import { exec } from 'child_process';
import logger from '../logger';
import {
  INDEX,
  ESDUMP_LOCATION,
  ELASTICSEARCH_HOST
} from '../config';

const execute = util.promisify( exec );


/**
 * dumpEs
 * A light wrapper around elasticsearch-dump {@link https://github.com/elasticsearch-dump/elasticsearch-dump}
 * for dumping or restoring elasticsearch
 *
 * @param {String} op Enum 'dump' or 'restore'
 */
const dumpEs = async op => {

  const ES_TYPES = new Set(['analyzer', 'mapping', 'data']); // note order
  const esdump_limit = 10000;
  const esdump_overwrite = true;
  const indexUrl = `http://${ELASTICSEARCH_HOST}/${INDEX}`;

  for( let type of ES_TYPES ) {
    logger.info(`Performing elasticsearch ${op} for ${INDEX} ${type}...`);

    const esdumpFilename = `${INDEX}_${type}.json`;
    const esdumpUrl = `${ESDUMP_LOCATION}${esdumpFilename}`;
    const input = op === 'dump' ? indexUrl : esdumpUrl;
    const output = op === 'dump' ? esdumpUrl : indexUrl;

    const cmd = [
      'elasticdump',
      `--input=${input}`,
      `--output=${output}`,
      `--type=${type}`,
      `--limit=${esdump_limit}`,
      `--overwrite=${esdump_overwrite}`
    ].join(' ');

    logger.info( cmd );

    const opts = {};
    const { stdout, stderr } = await execute( cmd, opts );
    logger.info( stdout );
    logger.error( stderr );
  }
};

export default dumpEs;
