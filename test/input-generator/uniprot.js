import xmlBuilder from 'xmlbuilder';
import Query from './query';
import fs from 'fs';
import path from 'path';

const NS = 'uniprot';
const FILE_PATH = path.join( 'test', 'input', 'uniprot.xml' );

const TAGS = Object.freeze({
  UNIPROT: 'uniprot',
  PROTEIN: 'protein',
  ENTRY: 'entry',
  ACCESSION: 'accession',
  NAME: 'name',
  ALTERNATIVE_NAME: 'alternativeName',
  FULL_NAME: 'fullName',
  GENE: 'gene',
  ORGANISM: 'organism',
  DB_REFERENCE: 'dbReference'
});

let query = new Query( NS );
query.getEntries().then( entries => {
  let xmlRoot = xmlBuilder.create( TAGS.UNIPROT );

  entries.forEach( entry => {
    let { id, name, proteinNames, geneNames, organism } = entry;

    let entryObj = xmlRoot.ele( TAGS.ENTRY );
    entryObj.ele( TAGS.ACCESSION, id );
    entryObj.ele( TAGS.NAME, name );

    const nonEmptyList = list => list && list.length > 0;

    if ( nonEmptyList( proteinNames ) ) {
      let proteinObj = entryObj.ele( TAGS.PROTEIN );
      proteinNames.forEach( name => {
        proteinObj
          .ele( TAGS.ALTERNATIVE_NAME )
          .ele( TAGS.FULL_NAME, name );
      } );
    }

    if ( nonEmptyList( geneNames ) ) {
      let geneObj = entryObj.ele( TAGS.GENE );
      geneNames.forEach( name => {
        geneObj.ele( TAGS.NAME, name );
      } );
    }

    let orgObj = entryObj.ele( TAGS.ORGANISM );
    let dbRefObj = orgObj.ele( TAGS.DB_REFERENCE, { id: organism } );
  } );

  let pretty = true;
  let xmlContent = xmlRoot.end({ pretty });

  fs.writeFileSync( FILE_PATH, xmlContent );
} );
