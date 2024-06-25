import mocha from 'mocha';
import _ from 'lodash';
import { Parser } from 'json2csv';
import { appendFileSync } from 'fs';

const isGet = s => /^get/.test( s );
const isSearch = s => /^search/.test( s );
const parse = ( fields, json ) => new Parser({ fields }).parse( json );
const DEFAULT_FIELDS = [
  'title',
  'state',
  'text',
  'expected.namespace',
  'expected.id',
  'expected.esScore',
  'actual.namespace',
  'actual.id',
  'actual.esScore'
];

// Yes, hackey, but good enough for this reporter
const message2JSON = message => {
  const MESSAGE_RE = /: expected/;
  const str = _.head( message.split( MESSAGE_RE ) );
  return JSON.parse(str);
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
  let getFailJSON = [];
  let searchFailJSON = [];

  runner.on( 'pass', ( test ) => {
    if( isSearch( test.title ) ){
      stats.search.passes++;
    } else if ( isGet( test.title ) ){
      stats.get.passes++;
    }
  });

  runner.on( 'fail', ( test, err ) => {
    const messageData = message2JSON( err.message );
    if( isSearch( test.title ) ){
      searchFailJSON.push( _.assign( {}, test, messageData ) );
      stats.search.failures++;
    } else if ( isGet( test.title ) ){
      getFailJSON.push( _.assign( {}, test, messageData ) );
      stats.get.failures++;
    }
  });

  runner.on( 'end', () => {
    const searchFailures = parse( DEFAULT_FIELDS.concat([ 'organismOrdering', 'rank' ]), searchFailJSON );
    const getFailures = parse( DEFAULT_FIELDS, getFailJSON );
    const summary = parse( [ 'type', 'passes', 'failures' ], [ stats.search, stats.get ] );
    write2File([ searchFailures, getFailures, summary ]);
  });
}

module.exports = QualityReporter;