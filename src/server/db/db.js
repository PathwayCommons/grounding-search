const _ = require('lodash');
const elasticsearch = require('elasticsearch');

const TYPE = 'entry';
const META_SEARCH_FIELD = 'meta_search';
const MIN_GRAM = 1;
const MAX_GRAM = 45;

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
    let client = this.connect();
    let deleteIndex = () => this.deleteIndex( index );
    let createIndex = () => this.createIndex( index );

    return client.indices.exists( { index } )
      .then( exists => exists ? deleteIndex() : Promise.resolve() )
      .then( createIndex );
  },
  insertEntries: function( index, entries ){
    let client = this.connect();
    let body = [];

    entries.forEach( entry => {
      body.push( { index: { _index: index, _type: TYPE } } );
      body.push( entry );
    } );

    return client.bulk( { body } );
  },
  search: function( index, searchkey ){
    let client = this.connect();
    let searchParam = {};
    _.set( searchParam, [ 'query', 'match', META_SEARCH_FIELD ], searchkey );

    return client.search( { index, type: TYPE, body: searchParam } );
  }
};

module.exports = db;
