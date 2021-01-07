import util from 'util';
import { exec } from 'child_process';
import logger from '../logger';
import {
  INDEX,
  INPUT_PATH,
  ESDUMP_OUTPUT,
  ESDUMP_TYPE,
  ESDUMP_LIMIT,
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

  const indexUrl = `http://${ELASTICSEARCH_HOST}/${INDEX}`;
  const dataUrl = `./${INPUT_PATH}/${ESDUMP_OUTPUT}`;
  const input = op === 'dump' ? indexUrl : dataUrl;
  const output = op === 'dump' ? dataUrl : indexUrl;

  const cmd = [
    'elasticdump',
    `--input=${input}`,
    `--output=${output}`,
    `--type=${ESDUMP_TYPE}`,
    `--limit=${ESDUMP_LIMIT}`,
    `--overwrite=${true}`
  ].join(' ');

  const opts = {};
  const { stdout, stderr } = await execute( cmd, opts );
  logger.info( stdout );
  logger.error( stderr );
};

export default dumpEs;
