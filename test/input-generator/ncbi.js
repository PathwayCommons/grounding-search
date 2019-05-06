import Query from './query';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const NODE_DELIMITER = '\t';
const LINE_DELIMITER = '\n';
const LIST_DELIMITER = '|';
const EMPTY_VALUE = '-';
const HEADER_ARR = [ '#tax_id', 'GeneID', 'Symbol', 'LocusTag', 'Synonyms', 'dbXrefs',
  'chromosome', 'map_location', 'description', 'type_of_gene',
  'Symbol_from_nomenclature_authority', 'Full_name_from_nomenclature_authority',
  'Nomenclature_status', 'Other_designations', 'Modification_date', 'Feature_type'];
const HEADER_LINE = HEADER_ARR.join( NODE_DELIMITER );
const NUM_OF_NODES = HEADER_ARR.length;
const NS = 'ncbi';
const FILE_PATH = path.join( 'test', 'input', 'ncbi' );

const NODE_INDICES = Object.freeze({
  ORGANISM: 0,
  ID: 1,
  SYMBOL: 2,
  SYNONYMS: 4
});

const FIELD_NAMES = Object.freeze({
  ORGANISM: 'organism',
  ID: 'id',
  SYMBOL: 'name',
  SYNONYMS: 'synonyms'
});

const INDEX_TO_NAME = {};
Object.keys( NODE_INDICES ).forEach( n => {
  let index = NODE_INDICES[ n ];
  let fieldName = FIELD_NAMES[ n ];

  INDEX_TO_NAME[ index ] = fieldName;
} );

let query = new Query( NS );
query.getEntries().then( entries => {
  let lines = [ HEADER_LINE ];

  entries.forEach( entry => {
    let nodes = [];
    for ( let i = 0; i < NUM_OF_NODES; i++ ) {
      let name = INDEX_TO_NAME[ i ];
      let val = name && entry[ name ];

      if ( val ) {
        if ( _.isArray( val ) ) {
          val = val.join( LIST_DELIMITER );
        }
      }
      else {
        val = EMPTY_VALUE;
      }

      nodes.push( val );
    }

    let line = nodes.join( NODE_DELIMITER );
    lines.push( line );
  } );

  const content = lines.join( LINE_DELIMITER );
  fs.writeFileSync( FILE_PATH, content );
} );
