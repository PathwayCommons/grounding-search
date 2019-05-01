import { SEARCH_OBJECT } from '../util/search';
import { db } from '../../src/server/db';
import _ from 'lodash';

const SEARCH_SIZE = 5;

function getEntries( namespace ) {
  let searchValues = Object.values( SEARCH_OBJECT );
  let searchKeys = Object.keys( SEARCH_OBJECT );

  let requiredIDs = searchValues
    .filter( grounding => grounding && grounding.namespace == namespace )
    .map( grounding => grounding.id );

  let search = name => db.search( name, namespace );
  let get = id => db.get( id, namespace );

  let addMissingEntries = entries => {
    let existingIds = new Set( entries.map( e => e.id ) );
    let missingIds = requiredIDs.filter( id => !existingIds.has( id ) );
    let getPromises = missingIds.map( get );
    let isNonNil = e => !_.isNil( e );

    // Looks like some of expected groundings results in search object has
    // not yet supported organisms so get queries may end up with returning
    // nil results. Therefore, filtering non-nil results is needed for now.
    return Promise.all( getPromises )
      .then( missingEntries => entries.concat( missingEntries.filter( isNonNil ) ) )
  };

  let distinctFlatten = groups => {
    let members = [];
    let existing = new Set();

    groups = groups.slice(0, SEARCH_SIZE);

    groups.forEach( group => {
      let newMembers = group.filter( m => !existing.has( m ) );
      newMembers.forEach( m => existing.add( m ) );
      members = members.concat( newMembers );
    } );

    return Promise.resolve( members );
  };

  let searchPromises = searchKeys.map( search );

  return Promise.all( searchPromises )
    .then( distinctFlatten )
    .then( addMissingEntries );
}

export { getEntries };
