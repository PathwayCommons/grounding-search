import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { SEARCH_OBJECT } from './util/search';
import { db } from '../src/server/db';

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};

const searchEnt = name => aggregate.search( name );
const getEnt = (ns, id) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();

const GENE_LIST = Object.keys( SEARCH_OBJECT );

describe('Search and Get Aggregate', function(){
  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  GENE_LIST.forEach( name => {
    const expectedGrounding = SEARCH_OBJECT[name]; // could be null b/c we haven't specified groundings yet...

    if( !expectedGrounding ){ return; } // skip if no grounding specified

    const { id, namespace } = expectedGrounding;

    it(`search ${name}`, function(){
      return ( searchEnt(name)
        .then( results => {
          expect(results).to.exist;

          let firstResult = results[0];

          expect(firstResult).to.exist;
          expect(firstResult.namespace, 'namespace').to.equal(namespace);
          expect(firstResult.id, 'id').to.equal(id);
        } )
      );
    });

    it(`get ${name}`, function(){
      return ( getEnt(namespace, id)
        .then( result => {
          expect(result, 'result').to.exist;
          expect(result.namespace, 'namespace').to.equal(namespace);
          expect(result.id, 'id').to.equal(id);
        } )
      );
    });

  }); // for each

}); // describe
