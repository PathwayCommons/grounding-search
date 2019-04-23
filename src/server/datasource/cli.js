// cli for updating/clearing a datasource

import process from 'process';
import logger from '../logger';
import { uniprot } from './uniprot';
import { chebi } from './chebi';
import { ncbi } from './ncbi';

const sources = { uniprot, chebi, ncbi };
const op = process.argv[2];
const passedSourceId = process.argv[3];
const source = sources[passedSourceId];

if( op !== 'update' && op !== 'clear' && op !== 'index' ){
  logger.error(`Op '${op}' not supported; try 'update' or 'clear'`);
}

if( source == null ){
  logger.error(`No source '${passedSourceId}' found`);
} else {
  logger.info(`Applying ${op} on source '${passedSourceId}'...`);

  let fcn = op === 'update' || op === 'index' ? source.update : source.clear;
  let forceDownload = op === 'update';

  fcn(forceDownload).then(() => {
    logger.info(`Successfully applied ${op} on source '${passedSourceId}'`);
  }).catch(err => {
    logger.error(`Failed to apply ${op} on source '${passedSourceId}'`);
    logger.error(err);
  });
}