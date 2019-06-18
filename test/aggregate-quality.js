import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { SEARCH_OBJECTS } from './util/search';
import { db } from '../src/server/db';
import { sanitizeNameForCmp as sanitize } from '../src/server/util';
import _ from 'lodash';

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

const isSameSanitized = (name1, name2) => sanitize(name1) === sanitize(name2);

const getDispId = ent => `${ent.namespace}:${ent.id}`;

const DEFAULT_LOOSE = 3;

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
        let loose = entity.loose || testCase.loose;

        if( !_.isNumber(loose) ){
          loose = loose ? DEFAULT_LOOSE : 0;
        }

        if( !xref_id ){ return; } // skip if no grounding specified

        it(`search ${text} ${organismOrdering || []}`, function(){
          return ( searchEnt(text, organismOrdering)
            .then( results => {
              expect( results ).to.exist;

              const isExpectedResult = res => res.namespace === entity.namespace && res.id === xref_id;
              const firstResult = results[0];
              const topResults = results.slice(0, loose);

              expect(firstResult, 'first result').to.exist;

              const expected = `${namespace}:${xref_id}`.toUpperCase();

              if( loose === 0 ){
                const actual = `${firstResult.namespace}:${firstResult.id}`.toUpperCase();

                expect(actual).to.equal(expected);
              } else {
                expect(results.some(isExpectedResult), `expected result ${expected} in the result set`);

                expect(topResults.some(isExpectedResult), `expected result ${expected} in top ${loose} (${topResults.map(getDispId)})`).to.be.true;
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
