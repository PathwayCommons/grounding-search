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
        const nullGround =  isNullGround( ground );
        const type = nullGround ? 'Negative' : 'Positive';
        const organismOrdering = entity.organismOrdering || testCase.organismOrdering || [];

        it(`search ${type} ${text} ${organismOrdering}`, function(){
          return ( searchEnt(text, organismOrdering)
            .then( results => {
              // Actual is the first result, when it exists
              const actual = pickRecord( _.first( results ) );

              // Expected is replaced with search hit, when it is returned
              let expected = pickRecord( ground );
              const rank = _.findIndex( results, _.matches( ground ) );
              const found = rank >= 0;
              if ( found ) expected = pickRecord( _.nth( results, rank ) );

              const message = JSON.stringify({ text, organismOrdering, expected, actual, rank });

              // Compare only namespace and id
              const actualXref = _.pick( actual, [ 'namespace', 'id' ] );
              expect( actualXref, message ).to.eql( ground );
            })
          );
        });

        it(`get ${text}`, function(){
          if( nullGround ) return;
          return ( getEnt( namespace, id )
            .then( result => {
              const actual = pickRecord( result );
              const message = JSON.stringify({ text, ground, actual });
              const actualXref = _.pick( actual, [ 'namespace', 'id' ] );
              expect( actualXref, message ).to.eql( ground );
            } )
          );
        });
      }); // entities
    });

  }); // SEARCH_OBJECTS

}); // describe
