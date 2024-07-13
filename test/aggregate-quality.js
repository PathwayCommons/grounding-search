import { expect } from './util/chai';
import { aggregate, applyToEachDS } from './util/datasource';
import { forceDownload, buildIndex } from './util/param';
import { SEARCH_OBJECTS } from './util/search';
import { db } from '../src/server/db';
import _ from 'lodash';

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update( forceDownload ) );
  return guaranteeIndex().then( updateEach );
};

const searchEnt = ( name, organismOrdering ) => {
  return aggregate.search( name, ['ncbi', 'chebi', 'fplx'], organismOrdering );
};

const getEnt = ( ns, id ) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();
const pickRecord = o => {
  const DEFAULT_FIELDS = { namespace: null, id: null, esScore: null };
  const picked = _.pick( o, [ 'namespace', 'id', 'esScore' ] );
  return _.defaults( picked, DEFAULT_FIELDS );
};
const isNullGround = ground => _.isNull( ground.namespace ) && _.isNull( ground.id );

describe('Search and Get Aggregate', function(){
  this.timeout(10000);

  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  SEARCH_OBJECTS.forEach( testCase => {
    const { id: testID, entities } = testCase;

    describe(`Testing ${testID}`, () => {
      entities.forEach( entity => {
        const { text, xref_id: id, namespace } = entity;
        let ground = { namespace, id };
        const nullGround = isNullGround( ground );
        const type = nullGround ? 'Negative' : 'Positive';
        const organismOrdering = entity.organismOrdering || testCase.organismOrdering || [];

        it(`search ${type} ${text} ${organismOrdering}`, function(){
          return ( searchEnt(text, organismOrdering)
            .then( results => {
              // Predicted is the first result, when it exists
              const predicted = pickRecord( _.first( results ) );

              // Expected is replaced with search hit, when it is returned
              let actual = pickRecord( ground );

              // Rank is the index of the ground truth in the search results
              // OR -1 if not present
              // OR -2 if does not exist in the dictionary
              let rank = _.findIndex( results, _.matches( ground ) );
              const found = rank >= 0;
              if ( found ){
                actual = pickRecord( _.nth( results, rank ) );
              } else if ( nullGround ) {
                rank = -2;
              }
              const message = JSON.stringify({ text, organismOrdering, actual, predicted, rank });

              // Compare only namespace and id
              const predictedXref = _.pick( predicted, [ 'namespace', 'id' ] );
              expect( predictedXref, message ).to.eql( ground );
            })
          );
        });

        it(`get ${type} ${text}`, function(){
          if( nullGround ) return;
          return ( getEnt( namespace, id )
            .then( result => {
              const predicted = pickRecord( result );
              const message = JSON.stringify({ text, ground, predicted });
              const predictedXref = _.pick( predicted, [ 'namespace', 'id' ] );
              expect( predictedXref, message ).to.eql( ground );
            } )
          );
        });
      }); // entities
    });

  }); // SEARCH_OBJECTS

}); // describe
