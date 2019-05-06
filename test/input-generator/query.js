import _ from 'lodash';

import { SEARCH_OBJECTS } from '../util/search';
import { aggregate } from '../../src/server/datasource/aggregate';

class Query {
  static get SEARCH_SIZE(){
    return 5;
  }

  constructor( namespace, searchObjects = SEARCH_OBJECTS ){
    this.namespace = namespace;
    this.searchObjects = searchObjects;
  }

  getSearchEntities(){
    if ( this.entities ){
      return this.entities;
    }

    let entities = [];

    this.searchObjects.forEach( s => {
      let newEntities = s.entities
        .filter( ent => ent.xref_id != null )
        .map( ent => _.clone( ent ) );

      newEntities
        .forEach( ent => ent.organismOrdering = ent.organismOrdering || s.organismOrdering );

      entities = entities.concat( newEntities );
    } );

    // there are some duplicate entities in data files eliminate duplications here
    const compare = ( a, b ) => a.xref_id == b.xref_id
      && a.namespace == b.namespace
      && a.text == b.text;
    entities = _.uniqWith( entities, compare );

    this.entities = entities;
    return entities;
  }

  getRequiredIds(){
    if ( this.requiredIDs ) {
      return this.requiredIDs;
    }

    let entities = this.getSearchEntities();
    let requiredIDs = entities
      .filter( entity => entity.namespace == this.namespace )
      .map( entity => entity.xref_id );

    this.requiredIDs = requiredIDs;
    return requiredIDs;
  }

  getSearchParams(){
    if ( this.searchParams ) {
      return this.searchParams;
    }

    let entities = this.getSearchEntities();
    let searchParams = entities.map( entity => _.pick( entity, [ 'text', 'organismOrdering' ] ) );
    this.searchParams = searchParams;
    return searchParams;
  }

  search(text, organismOrdering){
    return aggregate
      .search( text, this.namespace, organismOrdering )
      .then( res => res.slice(0, this.SEARCH_SIZE) );
  }

  getEntries(){
    let existingIds = new Set();

    let requiredIDs = this.getRequiredIds();

    let searchParams = this.getSearchParams();

    let search = ( { text, organismOrdering } ) => this.search( text, organismOrdering );

    let get = id => aggregate.get( this.namespace, id );

    let addMissingEntries = entries => {
      let missingIds = _.uniq( requiredIDs.filter( id => !existingIds.has( id ) ) );
      let getPromises = missingIds.map( get );
      let isNonNil = e => !_.isNil( e );

      // Looks like some of expected groundings results in search object has
      // not yet supported organisms so get queries may end up with returning
      // nil results. Therefore, filtering non-nil results is needed for now.
      return Promise.all( getPromises )
        .then( missingEntries => entries.concat( missingEntries.filter( isNonNil ) ) );
    };

    let distinctFlatten = groups => {
      let members = [];

      groups.forEach( group => {
        let newMembers = group.filter( m => !existingIds.has( m.id ) );
        newMembers.forEach( m => existingIds.add( m.id ) );
        members = members.concat( newMembers );
      } );

      return Promise.resolve( members );
    };

    const searchAll = () => {
      let start = 0;
      let chunkSize = 20;
      let results = [];

      const searchChunk = () => {
        if ( start >= searchParams.length ) {
          return Promise.resolve( results );
        }

        let chunk = searchParams.slice(start, start + chunkSize);
        let searchPromises = chunk.map( search );
        return Promise.all( searchPromises )
          .then( res => {
            start = start + chunkSize;
            results = results.concat( res );
          } )
          .then( searchChunk );
      };

      return searchChunk();
    };

    return searchAll()
      .then( distinctFlatten )
      .then( addMissingEntries );
  }
}

export default Query;
