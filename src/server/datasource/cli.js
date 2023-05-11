// cli for updating/clearing a datasource

import process from 'process';
import logger from '../logger';
import { famplex } from './famplex';
import { uniprot } from './uniprot';
import { chebi } from './chebi';
import { ncbi } from './ncbi';
import { db } from '../db';
import { formatDistanceStrict } from 'date-fns';
import dumpEs from './esdump';

const sources = { famplex, uniprot, chebi, ncbi };
const op = process.argv[2];
const passedSourceId = process.argv[3];
const source = sources[passedSourceId];
const validOps = ['update', 'clear', 'index', 'download', 'dump', 'restore'];
const startTime = new Date();

if( !validOps.some(vo => vo === op) ){
  logger.error(`Op '${op}' not supported; try 'update' or 'clear'`);
}

if( op === 'clear' && passedSourceId === 'all' ){
  logger.info('Clearing entire index');
  db.deleteIndex().then(() => logger.info('Successfully cleared entire index'));

} else if( op === 'dump' || op === 'restore' ){
  dumpEs( op ).then(() => {
    logger.info(`Successful elasticsearch ${op}`);
    process.exit(0);
  }).catch(err => {
    logger.error(`Error in elasticsearch ${op}`);
    logger.error(err);
    process.exit(1);
  });

} else if( source == null ){
  logger.error(`No source '${passedSourceId}' found`);

} else {
  logger.info(`Applying ${op} on source '${passedSourceId}'...`);

  let fcn = source[op];

  fcn().then(() => {
    const endTime = new Date();
    const duration = formatDistanceStrict(endTime, startTime);

    logger.info(`Successfully applied ${op} on source '${passedSourceId}' in ${duration}`);
    process.exit(0);
  }).catch(err => {
    logger.error(`Failed to apply ${op} on source '${passedSourceId}'`);
    logger.error(err);
    process.exit(1);
  });
}