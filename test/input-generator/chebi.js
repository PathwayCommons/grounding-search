const xmlBuilder = require('xmlbuilder');
const { getEntries } = require('./db');
const fs = require('fs');
const path = require('path');

const NS = 'chebi';
const FILE_PATH = path.join( 'test', 'input', 'chebi.owl' );

const TAGS = Object.freeze({
  RDF: 'rdf:RDF',
  CLASS: 'owl:Class',
  ID: 'oboInOwl:id',
  NAME: 'rdfs:label',
  SYNONYM: 'oboInOwl:hasRelatedSynonym'
});

getEntries( NS ).then( entries => {
  let xmlRoot = xmlBuilder.create( TAGS.RDF );

  entries.forEach( entry => {
    let { id, name, synonyms } = entry;

    let classObj = xmlRoot.ele( TAGS.CLASS );
    classObj.ele( TAGS.ID, id );
    classObj.ele( TAGS.NAME, name );

    synonyms.forEach( s => {
      classObj.ele( TAGS.SYNONYM, s );
    } );
  } );

  let pretty = true;
  let xmlContent = xmlRoot.end({ pretty });

  fs.writeFileSync( FILE_PATH, xmlContent );
} );
