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
  return aggregate.search( name, ['ncbi', 'chebi'], organismOrdering );
};

const getEnt = ( ns, id ) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();
const pickRecord = ( o, idPref ) => {
  let res = _.pick( o, [ 'namespace', 'id' ] );
  if ( idPref && res.id != idPref && _.includes( o.ids, idPref ) ) {
    _.set( res, 'id', idPref );
  }

  return res;
};

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
        if( !id || !namespace ) return;
        const expected = _.assign( {}, { namespace, id } );
        const organismOrdering = entity.organismOrdering || testCase.organismOrdering || [];

        it(`search ${text} ${organismOrdering}`, function(){
          return ( searchEnt(text, organismOrdering)
            .then( results => {
              const rank = _.findIndex( results,  _.matches( expected ) );
              let topRes = _.head( results );
              const actual =  pickRecord( topRes, expected.id );
              const message = JSON.stringify({ text, organismOrdering, expected, actual, rank });
              expect( actual, message ).to.eql( expected );
            })
          );
        });

        it(`get ${text}`, function(){
          return ( getEnt( namespace, id )
            .then( result => {
              const actual =  pickRecord( result, id );
              const message = JSON.stringify({ text, expected, actual });
              expect( actual, message ).to.eql( expected );
            } )
          );
        });
      }); // entities
    });

  }); // SEARCH_OBJECTS

}); // describe
