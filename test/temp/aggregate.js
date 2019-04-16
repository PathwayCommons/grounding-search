import { expect, should } from '../util/chai';
import { aggregate, applyToEachDS , datasources, uniprot, chebi } from '../util/datasource';
import { forceDownload, maxSearchSize, buildIndex } from '../util/param';
import { SEARCH_OBJECT } from '../util/search';
import { db } from '../../src/server/db';
import _ from 'lodash';

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};

const searchEnt = name => aggregate.search( name );
const getEnt = (ns, id) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();
const getFirstId = e => _.get( e, [ 0, 'id' ] );

const GROUNDING_LIST = Object.values( SEARCH_OBJECT );
const GENE_LIST = Object.keys( SEARCH_OBJECT );

describe('Search and Get Aggregate', function(){
  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  GENE_LIST.forEach( (name, i) => {
    const expectedGrounding = GROUNDING_LIST[i] || {}; // could be null b/c we haven't specified groundings yet...
    const { id, namespace } = expectedGrounding;

    it(`search ${name}`, function(){
      return ( searchEnt(name)
        .then( results => {
          let firstResult = results[0];

          expect(firstResult.namespace, 'namespace').to.equal(namespace);
          expect(firstResult.id, 'id').to.equal(id);
        } )
      );
    });

    it(`get ${name}`, function(){
      return ( getEnt(id, namespace)
        .then( result => {
          expect(result.namespace, 'namespace').to.equal(namespace);
          expect(result.id, 'id').to.equal(id);
        } )
      );
    });

  }); // for each

}); // describe
