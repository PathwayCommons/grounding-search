import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import { INDEX, MAX_SEARCH_ES, ELASTICSEARCH_HOST, MAX_FUZZ_ES } from '../config';
import { sanitizeNameForCmp } from '../util';

const TYPE = 'entry';
const NS_FIELD = 'namespace';
const ORG_FIELD = 'organism';

/**
 * @exports db
 */
const db = {
  /**
   * Connects the elasticsearch, if it is not connected already, and returns the client.
   * @returns {elasticsearch.Client} Singleton elasticsearch client.
   */
  connect: function(){
    let client = this.client;

    if ( !client ) {
      client = this.client = new elasticsearch.Client({
        host: ELASTICSEARCH_HOST,
        // log: 'trace'
      });
    }

    return client;
  },
  /**
   * Refresh the elasticsearch index dedicated for the app.
   * @returns {Promise}
   */
  refreshIndex: function(){
    let client = this.connect();
    return client.indices.refresh( { index: INDEX } );
  },
  /**
   * Disable autorefreshing the index dedicated for the app.
   * @returns {Promise}
   */
  disableAutoRefresh: function(){
    let client = this.connect();
    let body = { refresh_interval: '-1' };
    return client.indices.putSettings( { index: INDEX, body } );
  },
  /**
   * Enable autorefreshing the index dedicated for the app.
   * @returns {Promise}
   */
  enableAutoRefresh: function(){
    let client = this.connect();
    let body = { refresh_interval: null };
    return client.indices.putSettings( { index: INDEX, body } );
  },
  /**
   * Create an elasticsearch index for the app.
   * @returns {Promise}
   */
  createIndex: function(){
    const client = this.connect();

    // include mappings for all fields that we use for search
    const mappings = {
      [TYPE]: {
        properties: {
          id: {
            type: 'keyword'
          },
          type: {
            type: 'keyword'
          },
          organism: {
            type: 'keyword'
          },
          name: {
            type: 'keyword',
            normalizer: 'name_norm'
          },
          synonyms: {
            type: 'keyword',
            normalizer: 'name_norm'
          }
        }
      }
    };

    const settings = {
      // number_of_shards: 5, // TODO reconsider default
      refresh_interval: '-1',
      analysis: {
        char_filter: {
          name_word_filter: {
            type: 'pattern_replace',
            pattern: '(-|\\s)',
            replacement: ''
          },
          alpha_filter: {
            type: 'pattern_replace',
            pattern: '(\\s|-|[0-9]|^)alpha(\\s|-|[0-9]|$)',
            replacement: '$1a$2'
          },
          alpha_filter2: {
            type: 'pattern_replace',
            pattern: '(\\w)alpha',
            replacement: '$1a'
          },
          beta_filter: {
            type: 'pattern_replace',
            pattern: '(\\s|-|[0-9]|^)beta(\\s|-|[0-9]|$)',
            replacement: '$1b$2'
          },
          beta_filter2: {
            type: 'pattern_replace',
            pattern: '(\\w)beta',
            replacement: '$1b'
          }
        },
        normalizer: {
          name_norm: {
            type: 'custom',
            filter: ['lowercase', 'asciifolding'],
            char_filter: ['alpha_filter', 'alpha_filter2', 'beta_filter', 'beta_filter2', 'name_word_filter']
          }
        }
      }
    };

    return client.indices.create( { index: INDEX, body: { mappings, settings } } );
  },
  /**
   * Create elasticsearch index for the app if it is not already existing.
   * @returns {Promise}
   */
  guaranteeIndex: function(){
    let indexExists = () => this.exists();
    let create = () => this.createIndex();
    let createIfNotExists = exists => exists ? Promise.resolve() : create();

    return (
      Promise.resolve()
        .then( indexExists )
        .then( createIfNotExists )
        .catch(err => { // in case running multiple index scripts in parallel
          return indexExists().then(exists => {
            if( !exists ){ throw err; }
          });
        })
    );
  },
  /**
   * Delete the elasticsearch index dedicated for the app.
   * @returns {Promise}
   */
  deleteIndex: function(){
    let client = this.connect();
    return client.indices.delete( { index: INDEX } );
  },
  /**
   * Delete the entries of given namespace.
   * @param {string} namespace The namespace to clear
   * @returns {Promise}
   */
  clearNamespace: function( namespace ){
    let client = this.connect();

    let body = {};
    _.set( body, [ 'query', 'bool', 'filter', 'term', NS_FIELD ], namespace );

    return client.deleteByQuery( { index: INDEX, body } );
  },
  /**
   * Recreate the elasticsearch index dedicated for the app. Deletes the index first if
   * it already exists.
   * @return {Promise}
   */
  recreateIndex: function(){
    this.connect();
    let deleteIndex = () => this.deleteIndex();
    let createIndex = () => this.createIndex();
    let indexExists = () => this.exists();

    return indexExists()
      .then( exists => exists ? deleteIndex() : Promise.resolve() )
      .then( createIndex );
  },
  /**
   * Insert the given entries to elasticsearch index dedicated for the app as a chunk.
   * @param {array} entries Entries to be inserted.
   * @param {boolean} [refresh=false] Whether to refresh the index after the operation is completed.
   * This parameter should be used carefully because refreshing after every insert would decrease
   * the performance.
   * See: https://www.elastic.co/guide/en/elasticsearch/guide/current/near-real-time.html#refresh-api
   * @returns {Promise}
   */
  insertEntries: function( entries, refresh = false ){
    let client = this.connect();
    let body = [];

    entries.forEach( entry => {

      // remove duplicate synonyms to avoid noisy elasticsearch results
      entry.synonyms = _.uniqBy(entry.synonyms, str => str.toLowerCase());

      // remove the main name from the synonym list (if it exists) for the same reason
      _.remove(entry.synonyms, syn => syn.toLowerCase() === entry.name.toLowerCase());

      body.push( { index: { _index: INDEX, _type: TYPE, _id: (entry.namespace + ':' + entry.id).toUpperCase() } } );
      body.push( entry );
    } );

    if( body.length === 0 ){
      throw new Error('Can not insert empty entries list into DB');
    }

    return client.bulk( { body, refresh } );
  },
  /**
   * Update the given entries in elasticsearch index dedicated for the app.
   * @param {array} updates An array of objects each of which defines the updates
   * to be applied on an entity.
   * @param {string} namespace Namespace  whose entities are to be updated e.g. 'uniprot', 'chebi', ...
   * @param {boolean} [refresh=false] Whether to refresh the index after the operation is completed.
   * This parameter should be used carefully because refreshing after every insert would decrease
   * the performance.
   * See: https://www.elastic.co/guide/en/elasticsearch/guide/current/near-real-time.html#refresh-api
   * @returns {Promise}
   */
  updateEntries: function( updates, namespace, refresh = false ){
    let client = this.connect();
    let body = [];

    updates.forEach( update => {
      body.push( { update: { _index: INDEX, _type: TYPE, _id: (namespace + ':' + update.id).toUpperCase() } } );
      body.push( { doc: update.updates } );
    } );

    if( body.length === 0 ){
      throw new Error('Can not update DB from empty list');
    }

    return client.bulk( { body, refresh } );
  },
  /**
   * Remove the entries with the given ids from the elasticsearch index dedicated for the app.
   * @param {array} entryIds Array of entry ids to be removed from the elasticsearch index.
   * @param {string} namespace Namespace  whose entities are to be removed e.g. 'uniprot', 'chebi', ...
   * @param {boolean} [refresh=false] Whether to refresh the index after the operation is completed.
   * This parameter should be used carefully because refreshing after every insert would decrease
   * the performance.
   * See: https://www.elastic.co/guide/en/elasticsearch/guide/current/near-real-time.html#refresh-api
   * @returns {Promise}
   */
  removeEntries: function( entryIds, namespace, refresh = false ){
    let client = this.connect();

    let body = {};

    let i = 0;

    if ( namespace ) {
      _.set( body, [ 'query', 'bool', 'filter', i, 'term', NS_FIELD ], namespace );
      i++;
    }

    _.set( body, [ 'query', 'bool', 'filter', i, 'terms', 'id' ], entryIds );

    return client.deleteByQuery( { index: INDEX, body, refresh } );
  },
  /**
   * Retrieve the entities matching best with the search string within maximum search size.
   * @param {string} searchString Key string for searching the best matching entities.
   * @param {string} [namespace=undefined] Namespace to seek the entities e.g. 'uniprot', 'chebi', ...
   * @param {number} fuzziness The amount of fuzziness to use.  Higher values allow looser matches.
   * @returns {Promise} Promise object represents the array of best matching entities.
   */
  search: function( searchString, namespace, fuzziness = MAX_FUZZ_ES, size = MAX_SEARCH_ES ){
    const index = INDEX;
    const type = TYPE;
    const client = db.connect();
    const processResult = res => res.hits.hits.map( entry => {
      entry._source.esScore = entry._score;

      return entry._source;
    });

    let query = {
      multi_match: {
        query: sanitizeNameForCmp(searchString),
        type: 'best_fields',
        fuzziness,
        fields: ['name', 'synonyms']
      }
    };

    if( !_.isNil(namespace) ){
      query = {
        bool: {
          must: {
            term: { [NS_FIELD]: namespace }
          },
          should: query
        }
      };
    }

    const body = {
      size,
      query
    };

    return client.search({ index, type, body }).then( processResult );
  },
  /**
   * Retrieve the entity that has the given id.
   * @param {string} id The id of entity to search
   * @param {string} [namespace=undefined] Namespace to seek the entity e.g. 'uniprot', 'chebi', ...
   * @returns {Promise} Promise objects represents the entity with the given id from the given namespace,
   * if there is no such entity it represents null.
   */
  get: function( id, namespace ){
    let client = this.connect();
    let body = {};

    _.set( body, ['query', 'bool', 'must', 'multi_match', 'fields'], ['id', 'ids'] );
    _.set( body, ['query', 'bool', 'must', 'multi_match', 'query'], id );
    _.set( body, ['query', 'bool', 'filter', 'term', NS_FIELD], namespace );

    return client.search({
      body,
      index: INDEX,
      type: TYPE
    }).then( res => res.hits.hits.map( e => e._source )[0] );
  },
  /**
   * Check if the elasticsearch index dedicated for the app exists.
   * @returns {Promise} Promise objects represents whether the index exists.
   */
  exists: function() {
    let client = this.connect();
    return client.indices.exists( { index: INDEX } );
  },
  /**
   * Returns the number of entities in a namespace.
   * @param {string} namespace Namespace to count number of entities.
   * @return {Promise} Promise objects represents the number of entities.
   */
  count: function(namespace) {
    let client = this.connect();
    let body = {};

    if ( namespace ) {
      _.set( body, ['query', 'bool', 'filter', 'term', NS_FIELD], namespace );
    }

    return client.count( { index: INDEX, body } ).then( res => res.count );
  },
  /**
   * Retrieve the entities having the given organism id/s.
   * @param {string} orgIds organism id/s to search by.
   * @param {string} [namespace=undefined] Namespace to seek the entities e.g. 'uniprot', 'chebi', ...
   * @param {string} [name=undefined] Name of entities that will be placed in search results.
   * @param {number} [from=0] Offset from the first result to be fetched
   * @param {number} [size=0] Max amount of hits to be returned.
   * @param {string} [scroll=undefined] The time to keep the search context open for.
   * If this parameter is set then from and size parameters are omitted and
   * all the hits are returned.
   * @returns {Promise} Promise object represents the array of best matching entities.
   */
  searchByOrg: function(orgIds, namespace, name, from = 0, size = MAX_SEARCH_ES, scroll ) {
    let client = this.connect();
    let body = { size, from };
    let index = INDEX;
    let type = TYPE;

    if ( scroll ) {
      body = { size: MAX_SEARCH_ES };
    }

    if ( !_.isArray( orgIds ) ) {
      orgIds = [ orgIds ];
    }

    let i = 0;

    if ( namespace ) {
      _.set( body, ['query', 'bool', 'filter', i, 'term', NS_FIELD], namespace );
      i++;
    }

    if ( name ) {
      _.set( body, ['query', 'bool', 'filter', i, 'term', 'name'], name );
      i++;
    }

    _.set( body, ['query', 'bool', 'filter', i, 'terms', ORG_FIELD], orgIds );

    let allResults = [];
    const processResult = res => res.hits.hits.map( entry => entry._source );
    const processAndLoadMore = res => {
      allResults = allResults.concat( processResult( res ) );
      if ( scroll && res.hits.total != allResults.length ) {
        return client.scroll( {
          scrollId: res._scroll_id,
          scroll
        } ).then( processAndLoadMore );
      }

      return Promise.resolve( allResults );
    };

    let searchParam = { index, type, body };
    if ( scroll ) {
      searchParam.scroll = scroll;
    }

    return client.search(searchParam).then( processAndLoadMore );
  }
};

export { db };
