const _ = require('lodash');
const elasticsearch = require('elasticsearch');

const TYPE = 'entry';
const META_SEARCH_FIELD = 'meta_search';
const ID_FIELD = 'id';
const MIN_GRAM = 1;
const MAX_GRAM = 45;

const processResult = res => res.hits.hits.map( entry => entry._source );

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
  refreshIndex: function( index ){
    let client = this.connect();
    return client.indices.refresh( { index } );
  },
  disableAutoRefresh: function( index ){
    let client = this.connect();
    let body = { refresh_interval: '-1' };
    return client.indices.putSettings( { index, body } );
  },
  enableAutoRefresh: function( index ){
    let client = this.connect();
    let body = { refresh_interval: null };
    return client.indices.putSettings( { index, body } );
  },
  createIndex: function( index ){
    let client = this.connect();
    let searchableFieldProps = { type: 'text', analyzer: 'ngram_analyzer', 'search_analyzer': 'standard' };
    let searchableFields = ['id', 'name', 'geneNames', 'proteinNames'];
    let searchableMatchStr = searchableFields.join('|');
    let mappings = {};
    let dynamicTemplates = [
      {
        'template_unsearchable': {
          'mapping': {
            'index': 'false'
          },
          'match_pattern': 'regex',
          'unmatch': searchableMatchStr,
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
        'template_get': {
          'mapping': {
            'type': 'text',
            'index': 'true',
            'copy_to': META_SEARCH_FIELD
          },
          'match_pattern': 'regex',
          'match': ID_FIELD,
          'match_mapping_type': 'string'
        }
      }
    ];

    let settings = {
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

    return client.indices.create( { index, body: { mappings, settings } } );
  },
  deleteIndex: function( index ){
    let client = this.connect();
    return client.indices.delete( { index } );
  },
  recreateIndex: function( index ){
    this.connect();
    let deleteIndex = () => this.deleteIndex( index );
    let createIndex = () => this.createIndex( index );
    let indexExists = () => this.exists( index );

    return indexExists()
      .then( exists => exists ? deleteIndex() : Promise.resolve() )
      .then( createIndex );
  },
  // 'refresh' parameter should be used carefully. Refreshing after every insert would decrease the performance.
  // See: https://www.elastic.co/guide/en/elasticsearch/guide/current/near-real-time.html#refresh-api
  insertEntries: function( index, entries, refresh = false ){
    let client = this.connect();
    let body = [];

    entries.forEach( entry => {
      body.push( { index: { _index: index, _type: TYPE } } );
      body.push( entry );
    } );

    return client.bulk( { body, refresh } );
  },
  search: function( index, searchkey, from = 0, size = 50 ){
    let client = this.connect();
    let searchParam = { from, size };
    _.set( searchParam, [ 'query', 'match', META_SEARCH_FIELD ], searchkey );

    return client.search( { index, type: TYPE, body: searchParam } )
      .then( processResult );
  },
  get: function( index, id ){
    let client = this.connect();
    let getParam = { size: 1 };
    _.set( getParam, [ 'query', 'match', ID_FIELD ], id );

    return client.search( { index, type: TYPE, body: getParam } )
      .then( processResult );
  },
  exists: function( index ) {
    let client = this.connect();
    return client.indices.exists( { index } );
  },
  count: function( index ) {
    let client = this.connect();
    return client.count( { index } ).then( res => res.count );
  }
};

module.exports = db;
