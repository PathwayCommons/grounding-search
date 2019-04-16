const { expect, should } = require('../util/chai');
const { aggregate, applyToEachDS , datasources, uniprot, chebi} = require('../util/datasource');
const { forceDownload, maxSearchSize, buildIndex } = require('../util/param');
const { SEARCH_OBJECT } = require('../util/search');
const db = require('../../src/server/db');
const _ = require('lodash');

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

const groundingSpecified = name => SEARCH_OBJECT[name] != null;

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
