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

let db = {
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
  refreshIndex: function(){
    let client = this.connect();
    return client.indices.refresh( { index: INDEX } );
  },
  disableAutoRefresh: function(){
    let client = this.connect();
    let body = { refresh_interval: '-1' };
    return client.indices.putSettings( { index: INDEX, body } );
  },
  enableAutoRefresh: function(){
    let client = this.connect();
    let body = { refresh_interval: null };
    return client.indices.putSettings( { index: INDEX, body } );
  },
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
  guaranteeIndex: function(){
    let indexExists = () => this.exists();
    let create = () => this.createIndex();

    return indexExists().then( exists => exists ? Promise.resolve() : create() );
  },
  deleteIndex: function(){
    let client = this.connect();
    return client.indices.delete( { index: INDEX } );
  },
  clearNamespace: function( namespace ){
    let client = this.connect();

    let body = {};
    _.set( body, [ 'query', 'bool', 'filter', 'term', NS_FIELD ], namespace );

    return client.deleteByQuery( { index: INDEX, body } );
  },
  recreateIndex: function(){
    this.connect();
    let deleteIndex = () => this.deleteIndex();
    let createIndex = () => this.createIndex();
    let indexExists = () => this.exists();

    return indexExists()
      .then( exists => exists ? deleteIndex() : Promise.resolve() )
      .then( createIndex );
  },
  // 'refresh' parameter should be used carefully. Refreshing after every insert would decrease the performance.
  // See: https://www.elastic.co/guide/en/elasticsearch/guide/current/near-real-time.html#refresh-api
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
  search: function( searchkey, namespace, from = 0, size = 50 ){
    return search( searchkey, META_SEARCH_FIELD, namespace, from, size );
  },
  get: function( id, namespace ){
    let size = 1;
    let from = 0;
    return search( id, ID_FIELD, namespace, from, size )
      .then( getFirstItem );
  },
  exists: function() {
    let client = this.connect();
    return client.indices.exists( { index: INDEX } );
  },
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
