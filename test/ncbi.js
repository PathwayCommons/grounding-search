import fs from 'fs';

import path from 'path';

import _ from 'lodash';

import { StringDecoder } from 'string_decoder';

import { NCBI_FILE_NAME, INPUT_PATH  } from '../src/server/config';
import { db } from '../src/server/db';
import { getOrganismById } from '../src/server/datasource/organisms';
import { isSupportedOrganism } from '../src/server/datasource/organisms';
import ROOT_STRAINS from '../src/server/datasource/strains/root';

import DatasourceTest from './datasource';

import { expect } from './util/chai';
import { ncbi } from './util/datasource';
import { buildIndex } from './util/param';

const decoder = new StringDecoder('utf8');
const ORG_INDEX = 0;
const ID_INDEX = 1;
const NAME_INDEX = 2;
const LINE_DELIMITER = '\n';
const NODE_DELIMITER = '\t';

/**
 * Returns the nth node in str, where the nodes are splited by the delimiter,
 * assuming that no adjacent occurance of the delimiter exists
 * @param {string} str String to seek the nth node.
 * @param {string} delimiter Delimiter that seperates the nodes.
 * @param {number} n Index of node to seek.
 */
const nthStrNode = ( str, delimiter, n ) => {
  let i = 0;
  let start = 0;
  while ( start != -1 && i < n ) {
    start = str.indexOf( delimiter, start ) + 1;
    i ++;
  }

  let end = str.indexOf( delimiter, start );

  // if there is no more occurance of the delimiter go until the end of str
  if ( end == -1 ) {
    end = undefined;
  }

  let node = str.substring( start, end );
  return node;
};

const getEntryLines = data => {
  let text = decoder.write( data );
  return text.split( LINE_DELIMITER )
    .filter( l => l.length > 0 )
    .slice( 1 )
    .filter( hasSupportedOrganism );
};

const hasSupportedOrganism = entryLine => {
  let orgId = getEntryOrg( entryLine );
  return isSupportedOrganism( orgId );
};

const readEntryLines = () => {
  let filePath = path.join(INPUT_PATH, NCBI_FILE_NAME);
  let data = fs.readFileSync( filePath );
  let lines = getEntryLines( data );

  return lines;
};

const getEntryId = entryLine => {
  let id = nthStrNode( entryLine, NODE_DELIMITER, ID_INDEX );
  return id;
};

const getEntryOrg = entryLine => {
  let org = nthStrNode( entryLine, NODE_DELIMITER, ORG_INDEX );
  return org;
};

const getEntryName = entryLine => {
  let name = nthStrNode( entryLine, NODE_DELIMITER, NAME_INDEX );
  return name.toLowerCase();
};

const numberOfMergedDescendants = entities => {
  let count = 0;

  Object.keys(ROOT_STRAINS).forEach( rootName => {
    let rootOrgId = ROOT_STRAINS[ rootName ];
    let rootOrg = getOrganismById( rootOrgId );
    let roots = _.filter( entities, e => getEntryOrg( e ) === '' + rootOrgId );

    let descendantOrgIds = rootOrg.descendantIds;
    let descendants = _.filter( entities, e => _.includes( descendantOrgIds, getEntryOrg( e ) ) );

    let rootsByName = _.groupBy( roots, e => getEntryName( e ) );
    let descendantsByName = _.groupBy( descendants, e => getEntryName( e ) );

    let descendantNames = Object.keys( descendantsByName );


    descendantNames.forEach( name => {
      count += descendantsByName[ name ].length;

      // if no root one of the descendants will be the root
      // so decrease the count by 1 in that case
      if ( rootsByName[ name ] === undefined ){
        count--;
      }
    } );
  } );

  return count;
};

const namespace = 'ncbi';
const entryLines = buildIndex ? readEntryLines() : [];
const sampleEntityId = buildIndex ? getEntryId( entryLines[ 0 ] ) : '7157';
const entryCount = entryLines.length - numberOfMergedDescendants(entryLines);
const sampleEntityNames = [ 'p53' ];
const datasource = ncbi;

let opts = { namespace, sampleEntityNames, sampleEntityId, entryCount, datasource, buildIndex };
DatasourceTest( opts );

// Test merge strains algorithm as specific to ncbi
describe(`merge strains ${namespace}`, function(){
  let testEntries = [
    {
      'namespace': 'ncbi',
      'type': 'protein',
      'id': '39537837',
      'organism': '562',
      'name': 'ccdB',
      'synonyms': [
        'type II toxin-antitoxin system toxin CcdB'
      ]
    },
    {
      'namespace': 'ncbi',
      'type': 'protein',
      'id': '18252830',
      'organism': '1311757',
      'name': 'ccdB',
      'synonyms': [
        'plasmid maintenance protein,Toxin CcdB'
      ]
    },
    {
      'namespace': 'ncbi',
      'type': 'protein',
      'id': '8164769',
      'organism': '563770',
      'name': 'ccdB',
      'synonyms': [
        'plasmid maintenance protein CcdB'
      ]
    },
    {
      'namespace': 'ncbi',
      'type': 'protein',
      'id': '9292836',
      'organism': '762608',
      'name': 'ccdB',
      'synonyms': [
        'cytotoxic protein CcdB'
      ]
    }
  ];

  let rootOrgId = 562;
  let rootEntry = _.find( testEntries, { 'organism': '' + rootOrgId } );
  let descendantEntries = _.difference( testEntries, [ rootEntry ] );

  mergeStrainsTest( testEntries, rootOrgId, 'root exists' );
  mergeStrainsTest( descendantEntries, rootOrgId, 'no root' );

  function mergeStrainsTest( entries, rootOrgId, message ) {
    describe( `merge strains ${namespace} ${message}`, function(){
      const createTestIndex = () => db.createIndex();
      const updateTestData = () => createTestIndex()
        .then( insertEntries )
        .then( mergeStrains )
        .then( refreshIndex );
      const removeTestIndex = () => db.deleteIndex();
      const mergeStrains = () => ncbi.mergeStrains();
      const insertEntries = () => db.insertEntries( entries, true );
      const searchByOrg = () => db.searchByOrg( rootOrgId, namespace );
      const refreshIndex = () => db.refreshIndex();
      const getEntryCount = () => db.count( namespace );

      before( function() {
        if ( !buildIndex ) {
          this.skip();
        }
        else {
          return updateTestData();
        }
      } );

      after( function() {
        if ( !buildIndex ) {
          this.skip();
        }
        else {
          return removeTestIndex();
        }
      } );

      it(`merge strains ${namespace} ${message}`, function( done ){
        let synonyms = _.uniq( _.concat( ...entries.map( e => e.synonyms ) ) );
        let ids = _.uniq( _.concat( entries.map( e => e.id ) ) );
        let organisms = _.uniq( _.concat( entries.map( e => e.organism ), '' + rootOrgId ) );

        searchByOrg().should.be.fulfilled.
          then( res => {
            let root = res[0];
            expect(root.synonyms, 'Synonyms of strains are merged correctly to root').to.deep.equalInAnyOrder(synonyms);
            expect(root.ids, 'Ids of strains are merged correctly to root').to.deep.equalInAnyOrder(ids);
            expect(root.organisms, 'Organisms of strains are merged correctly to root').to.deep.equalInAnyOrder(organisms);
          } )
          .then( () => getEntryCount().should.eventually.be.equal( 1, 'All descendants are removed after being merged to root' ) )
          .then( () => done(), error => done(error) );
      });
    } );
  }
});
