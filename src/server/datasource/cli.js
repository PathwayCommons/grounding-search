// cli for updating/clearing a datasource

const process = require('process');
const logger = console;
const uniprot = require('./uniprot');
const sources = { uniprot };
const op = process.argv[2];
const passedSourceId = process.argv[3];
const source = sources[passedSourceId];

if( op !== 'update' && op !== 'clear' ){
  logger.error(`Op '${op}' not supported; try 'update' or 'clear'`);
}

if( source == null ){
  logger.error(`No source '${passedSourceId}' found`);
} else {
  logger.info(`Applying ${op} on source '${passedSourceId}'...`);

  source.update().then(() => {
    logger.info(`Successfully applied ${op} on source '${passedSourceId}'`);
  }).catch(err => {
    logger.error(`Failed to apply ${op} on source '${passedSourceId}'`);
    logger.error(err);
  });
}