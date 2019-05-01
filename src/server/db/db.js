import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import { INDEX, MAX_SEARCH_ES, ELASTICSEARCH_HOST } from '../config';

const TYPE = 'entry';
const NS_FIELD = 'namespace';

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
          name: {
            type: 'text',
            analyzer: 'standard'
          },
          synonyms: {
            type: 'text',
            analyzer: 'standard'
          }
        }
      }
    };

    const settings = {
      number_of_shards: 5, // TODO reconsider default
      refresh_interval: '-1',
      analysis: {
        filter: {
          bigram: {
            type: 'ngram',
            min_gram: 2,
            max_gram: 2
          }
        },
        analyzer: {
          strdist: {
            type: 'custom',
            tokenizer: 'whitespace',
            filter: ['lowercase', 'bigram'],
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
      body.push( { index: { _index: INDEX, _type: TYPE, _id: (entry.namespace + ':' + entry.id).toUpperCase() } } );
      body.push( entry );
    } );

    if( body.length === 0 ){
      throw new Error('Can not insert empty entries list into DB');
    }

    return client.bulk( { body, refresh } );
  },
  /**
   * Retrieve the entities matching best with the search string within maximum search size.
   * @param {string} searchString Key string for searching the best matching entities.
   * @param {string} [namespace=undefined] Namespace to seek the entities e.g. 'uniprot', 'chebi', ...
   * @param {string} [from=0] Offset from the first result to fetch.
   * @param {string} [size=50] Maximum amount of hits to be returned.
   * @returns {Promise} Promise object represents the array of best matching entities.
   */
  search: function( searchString, namespace, from = 0, size = MAX_SEARCH_ES ){
    const index = INDEX;
    const type = TYPE;
    const client = db.connect();
    const processResult = res => res.hits.hits.map( entry => {
      entry._source.esScore = entry._score;

      return entry._source;
    });

    const body = {
      from,
      size,
      query: {
        multi_match: {
          query: searchString,
          type: 'best_fields',
          fuzziness: 3,
          fields: ['name', 'synonyms']
        }
      }
    };

    // TODO apply ns filter a different way...
    // if ( !_.isNil( namespace ) ) {
    //   _.set( body, [ 'query', 'bool', 'filter', 'term', NS_FIELD ], namespace );
    // }

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

    return client.get({
      id: (namespace + ':' + id).toUpperCase(),
      index: INDEX,
      type: TYPE
    }).then( res => res._source );
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
  }
};

export { db };
