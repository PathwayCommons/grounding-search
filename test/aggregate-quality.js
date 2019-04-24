import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { SEARCH_OBJECTS } from './util/search';
import { db } from '../src/server/db';

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};

const searchEnt = name => aggregate.search( name );
const getEnt = (ns, id) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();

describe('Search and Get Aggregate', function(){
  this.timeout(10000);

  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  
  
  SEARCH_OBJECTS.forEach( testCase => {
    const { id, entities } = testCase;

    describe(`Testing id ${id}`, function(){
      entities.forEach( entity => {
        const { text, xref_id, namespace } = entity;
  
        if( !xref_id ){ return; } // skip if no grounding specified
        
        it(`search ${text}`, function(){
          return ( searchEnt(text)
            .then( results => {
              expect( results ).to.exist;
    
              let firstResult = results[0];
    
              expect( firstResult ).to.exist;
              expect( firstResult.namespace, 'namespace' ).to.equal( namespace );
              expect( firstResult.id, 'id' ).to.equal( xref_id );
            } )
          );
        });
    
        it(`get ${text}`, function(){
          return ( getEnt( namespace, xref_id )
            .then( result => {
              expect( result, 'result' ).to.exist;
              expect( result.namespace, 'namespace' ).to.equal( namespace );
              expect( result.id, 'id' ).to.equal( xref_id );
            } )
          );
        });
      }); // entities
    });

  }); // SEARCH_OBJECTS

}); // describe
