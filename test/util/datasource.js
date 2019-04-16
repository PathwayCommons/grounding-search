import { aggregate } from '../../src/server/datasource/aggregate';
import { uniprot } from '../../src/server/datasource/uniprot';
import { chebi } from '../../src/server/datasource/chebi';
import { ncbi } from '../../src/server/datasource/ncbi';

const datasources = [ uniprot, chebi, ncbi ];

const applyToEachDS = op => {
  let promises = datasources.map( ds => op( ds ) );
  return Promise.all( promises );
};

export { aggregate, uniprot, chebi, ncbi, datasources, applyToEachDS };
