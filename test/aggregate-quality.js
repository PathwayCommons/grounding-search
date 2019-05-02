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

const searchEnt = (name, organismOrdering) => {
  return aggregate.search(name, null, organismOrdering);
};

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
        const organismOrdering = entity.organismOrdering || testCase.organismOrdering;

        if( !xref_id ){ return; } // skip if no grounding specified

        it(`search ${text} ${organismOrdering || []}`, function(){
          return ( searchEnt(text, organismOrdering)
            .then( results => {
              expect( results ).to.exist;

              const isExpectedResult = res => res.namespace === entity.namespace && res.id === xref_id;
              const firstResult = results[0];
              const topResults = results.slice(0, 3);

              // try with top result for now...

              const expected = `${namespace}:${xref_id}`.toUpperCase();
              const actual = `${firstResult.namespace}:${firstResult.id}`.toUpperCase();

              expect(firstResult, 'first result').to.exist;
              expect(actual, 'namespace').to.equal(expected);

              // in future maybe be more lenient...

              expect(topResults.some(isExpectedResult), 'top three has expected result').to.be.true;

              if( !isExpectedResult(firstResult) ){ // these cases are acceptable ties
                if( firstResult.name.toLowerCase() === text.toLowerCase() ){
                  // the first result is an exact name match so it's hard to differentiate
                } else if( firstResult.synonyms.some(syn => syn.toLowerCase() === text.toLowerCase()) ){
                  // the first result has an exact synonym match
                } else {
                  throw new Error('The first result is neither the expected result nor an exact text match');
                }
              }
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
