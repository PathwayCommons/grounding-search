import mocha from 'mocha';
import _ from 'lodash';
import { Parser } from 'json2csv';
import { appendFileSync } from 'fs';
import logger from '../../src/server/logger';

const isGet = s => /^get/.test( s );
const isSearch = s => /^search/.test( s );
const searchType = s => {
  let type = null;
  const match =   s.match( /^search\s(?<type>(Positive|Negative))/ );
  if( match ) type = match.groups.type;
  return type;
};
const parse = ( fields, json ) => new Parser({ fields }).parse( json );
const DEFAULT_FIELDS = [
  'title',
  'state',
  'text',
  'actual.namespace',
  'actual.id',
  'actual.esScore',
  'predicted.namespace',
  'predicted.id',
  'predicted.esScore'
];

// Yes, hackey, but good enough for this reporter
const message2JSON = message => {
  try {
    const MESSAGE_RE = /: expected/;
    const str = _.head( message.split( MESSAGE_RE ) );
    return JSON.parse(str);

  } catch( e ) {
    logger.error( 'Error parsing message' );
    logger.error( e.message );
    throw e;
  }
};

function write2File( data ) {
  const newline = '\r\n\r\n';
  const stamp = new Date().toJSON().replace( /:/g, '-' );
  const filename = `quality-report-${stamp}.txt`;
  for( const d of data ){
    appendFileSync( filename, d + newline );
  }
}

function QualityReporter( runner ) {
  mocha.reporters.Base.call( this, runner );
  const stats = {
    search: {
      type: 'search',
      passes: 0,
      failures: 0
    },
    get: {
      type: 'get',
      passes: 0,
      failures: 0
    }
  };
  const confusion = {
    actual_positive: {
      actual: 'positive',
      positive: 0,
      negative: 0
    },
    actual_negative: {
      actual: 'negative',
      positive: 0,
      negative: 0
    }
  };
  let getFailJSON = [];
  let searchFailJSON = [];

  runner.on( 'pass', ( test ) => {
    if( isSearch( test.title ) ){
      stats.search.passes++;
      const type = searchType( test.title );
      if( type === 'Positive' ){
        confusion.actual_positive.positive++;
      } else {
        confusion.actual_negative.negative++;
      }
    } else if ( isGet( test.title ) ){
      stats.get.passes++;
    }
  });

  runner.on( 'fail', ( test, err ) => {
    const isNullGround = ground => _.isNull( ground.namespace ) && _.isNull( ground.id );
    const messageData = message2JSON( err.message );
    if( isSearch( test.title ) ){
      searchFailJSON.push( _.assign( {}, test, messageData ) );
      stats.search.failures++;
      const type = searchType( test.title );
      const predictedIsNull = isNullGround( messageData.predicted );
      if( type === 'Positive' && predictedIsNull ){
        confusion.actual_positive.negative++;
      } else {
        confusion.actual_negative.positive++;
      }
    } else if ( isGet( test.title ) ){
      getFailJSON.push( _.assign( {}, test, messageData ) );
      stats.get.failures++;
    }
  });

  runner.on( 'end', () => {
    const searchFailures = parse( DEFAULT_FIELDS.concat([ 'organismOrdering', 'rank' ]), searchFailJSON );
    const getFailures = parse( DEFAULT_FIELDS, getFailJSON );
    const summary = parse( [ 'type', 'passes', 'failures' ], [ stats.search, stats.get ] );
    const confusion_matrix = parse( [ 'actual', 'positive', 'negative' ], [ confusion.actual_positive, confusion.actual_negative ] );
    write2File([ searchFailures, getFailures, summary, confusion_matrix ]);
  });
}

module.exports = QualityReporter;