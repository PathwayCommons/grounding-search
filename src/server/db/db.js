const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const { INDEX } = require('../config');

const TYPE = 'entry';
const META_SEARCH_FIELD = 'meta_search';
const ID_FIELD = 'id';
const NS_FIELD = 'namespace';
const MIN_GRAM = 1;
const MAX_GRAM = 45;

const processResult = res => res.hits.hits.map( entry => entry._source );
const getFirstItem = list => list.length > 0 ? list[ 0 ] : null;
const search = ( searchkey, searchField, namespace, from, size ) => {
  let client = db.connect();
  let searchParam = { from, size };

  if ( !_.isNil( namespace ) ) {
    _.set( searchParam, [ 'query', 'bool', 'filter', 'term', NS_FIELD ], namespace );
  }

  _.set( searchParam, [ 'query', 'bool', 'must', 'match', searchField ], searchkey );

  return client.search( { index: INDEX, type: TYPE, body: searchParam } )
    .then( processResult );
};

/**
 * @exports db
 */
let db = {
  /**
   * Connects the elasticsearch, if it is not connected already, and returns the client.
   * @returns {elasticsearch.Client} Singleton elasticsearch client.
   */
  connect: function(){
    let client = this.client;

    if ( !client ) {
      client = this.client = new elasticsearch.Client({
        host: 'localhost:9200',
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
    let client = this.connect();

    let searchableFieldProps = { type: 'text', analyzer: 'ngram_analyzer', 'search_analyzer': 'standard' };
    let searchableFields = ['id', 'name', 'synonyms'];
    let searchableMatchStr = searchableFields.join('|');
    let mappings = {};
    let dynamicTemplates = [
      {
        'template_unsearchable': {
          'mapping': {
            'index': 'false'
          },
          'match_pattern': 'regex',
          'unmatch': searchableMatchStr.concat('|', NS_FIELD),
          'match_mapping_type': '*'
        }
      },
      {
        'template_searchable': {
          'mapping': {
            'type': 'text',
            'index': 'false',
            'copy_to': META_SEARCH_FIELD
          },
          'match_pattern': 'regex',
          'match': searchableMatchStr,
          'unmatch': ID_FIELD,
          'match_mapping_type': 'string'
        }
      },
      {
        'template_id': {
          'mapping': {
            'type': 'text',
            'index': 'true',
            'copy_to': META_SEARCH_FIELD
          },
          'match_pattern': 'regex',
          'match': ID_FIELD,
          'match_mapping_type': 'string'
        }
      },
      {
        'template_ns': {
          'mapping': {
            'type': 'text',
            'index': 'true'
          },
          'match_pattern': 'regex',
          'match': NS_FIELD,
          'match_mapping_type': 'string'
        }
      }
    ];

    let settings = {
      'refresh_interval': '-1',
      'analysis': {
        'filter': {
          'ngram_filter': {
            'type': 'nGram',
            'min_gram': MIN_GRAM,
            'max_gram': MAX_GRAM
          }
        },
        'analyzer': {
          'ngram_analyzer': {
            'type': 'custom',
            'tokenizer': 'standard',
            'filter': [
              'lowercase',
              'ngram_filter'
            ]
          }
        }
      }
    };

    _.set( mappings, [ TYPE, 'properties', META_SEARCH_FIELD ], searchableFieldProps );
    _.set( mappings, [ TYPE, 'dynamic_templates' ], dynamicTemplates );

    return client.indices.create( { index: INDEX, body: { mappings, settings } } );
  },
  /**
   * Create elasticsearch index for the app if it is not already existing.
   * @returns {Promise} 
   */
  guaranteeIndex: function(){
    let indexExists = () => this.exists();
    let create = () => this.createIndex();

    return indexExists().then( exists => exists ? Promise.resolve() : create() );
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
      body.push( { index: { _index: INDEX, _type: TYPE } } );
      body.push( entry );
    } );

    if( body.length === 0 ){
      throw new Error('Can not insert empty entries list into DB');
    }

    return client.bulk( { body, refresh } );
  },
  /**
   * Retrieve the entities matching best with the search string within maximum search size.
   * @param {string} searchkey Key string for searching the best matching entities.
   * @param {string} [namespace=undefined] Namespace to seek the entities e.g. 'uniprot', 'chebi', ...
   * @param {string} [from=0] Offset from the first result to fetch.
   * @param {string} [size=50] Maximum amount of hits to be returned.
   * @returns {Promise} Promise object represents the array of best matching entities.
   */
  search: function( searchkey, namespace, from = 0, size = 50 ){
    return search( searchkey, META_SEARCH_FIELD, namespace, from, size );
  },
  /**
   * Retrieve the entity that has the given id.
   * @param {string} id The id of entity to search
   * @param {string} [namespace=undefined] Namespace to seek the entity e.g. 'uniprot', 'chebi', ...
   * @returns {Promise} Promise objects represents the entity with the given id from the given namespace, 
   * if there is no such entity it represents null.
   */
  get: function( id, namespace ){
    let size = 1;
    let from = 0;
    return search( id, ID_FIELD, namespace, from, size )
      .then( getFirstItem );
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

module.exports = db;
