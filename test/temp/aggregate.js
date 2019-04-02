const { expect, should } = require('../util/chai');
const { aggregate, applyToEachDS , datasources, uniprot, chebi} = require('../util/datasource');
const { forceDownload, maxSearchSize, buildIndex } = require('../util/param');
const db = require('../../src/server/db');
const _ = require('lodash');

const updateTestData = () => {
  let guaranteeIndex = () => db.guaranteeIndex();
  let updateEach = () => applyToEachDS( ds => ds.update(forceDownload) );
  return guaranteeIndex().then( updateEach );
};

const searchEnt = name => aggregate.search( name );
const getEnt = (ns, id) => aggregate.get( ns, id );
const removeTestIndex = () => db.deleteIndex();
const getFirstId = e => _.get( e, [ 0, 'id' ] );

// name (search string) : grounding object { namespace, id }
const SEARCH_OBJECT = Object.freeze({
  // Yang et al. Molecular Cell, Volume 53, Issue 1, 9 January 2014, Pages 88-100
  'hypoxia': null,
  'HIF-1 alpha': { namespace: 'uniprot', id: 'Q16665' }, // example grounding
  'P456': null,
  'vhl': null,
  // Jin et al. Molecular Cell, Volume 69, Issue 1, 4 January 2018, Pages 87-99
  'plag1': null,
  'gdh1': null,
  'alpha keto': null,
  'camkk2': null,
  'AMPK alpha': null,
  'mTOR': null,
  'Anoikis': null,
  'LKB1': null,
  // He et al. Molecular Cell, Volume 70, Issue 5, 7 June 2018, Pages 949-960
  'mTORC1': null,
  'GSK3': null,
  'Foxk1': null,
  '14-3-3 sigma': null,
  // Liu et al. Molecular Cell, Volume 65, Issue 1, 6 April 2017, Pages 117-128
  'CRPK1': null,
  '14-3-3 lambda': null,
  'CBF1': null,
  'CBF3': null,
  'RD29A': null,
  'COR15B': null,
  'KIN1': null,
  // Qian et al. Molecular Cell, Volume 65, Issue 5, 2017, pp917-931
  'S228': null,
  'K388': null,
  'S30': null,
  'VPS34': null,
  'ATG14L': null,
  'PI(3)P': null,
  // Clarke et al. Molecular Cell, Volume 65, Issue 5, 2017, pp900-916
  'PRMT5': null,
  'R205': null,
  'TIP60': null,
  'K16': null,
  '53BP1': null,
  'RIG-I': null,
  'MAVS': null,
  'TBK1': null,
  'IRF3': null,
  'IFN beta': null,
  'DAPK1': null,
  // Godfrey et al. Molecular Cell Volume 65, Issue 3, 2017, Pages 393-402
  'cdc55': null,
  'swe1': null,
  'cdc:28': null,
  'ask1': null,
  'net1': null,
  // Jeong et al. Molecular Cell Volume 65, Issue 1, 2017, Pages 154-167
  'IKK': null,
  'IkBalpha': null,
  'NF-kB': null,
  'miR-196b-3p': null,
  'CRPC': null,
  'Meis2': null,
  'PP2B': null,
  'Sox': null,
  'Oct4': null,
  'Nanog': null,
  'Twist': null
});

const GROUNDING_LIST = Object.values( SEARCH_OBJECT );
const GENE_LIST = Object.keys( SEARCH_OBJECT );

describe('Search and Get Aggregate', function(){
  if ( buildIndex ) {
    before(updateTestData);
    after(removeTestIndex);
  }

  GENE_LIST.forEach( (name, i) => {
    const expectedGrounding = GROUNDING_LIST[i] || {}; // could be null b/c we haven't specified groundings yet...
    const { id, namespace } = expectedGrounding;

    it(`search ${name}`, function(){
      return ( searchEnt(name)
        .then( results => {
          let firstResult = results[0];

          expect(firstResult.namespace, 'namespace').to.equal(namespace);
          expect(firstResult.id, 'id').to.equal(id);
        } )
      );
    });

    it(`get ${name}`, function(){
      return ( getEnt(id, namespace)
        .then( result => {
          expect(result.namespace, 'namespace').to.equal(namespace);
          expect(result.id, 'id').to.equal(id);
        } )
      );
    });

  }); // for each

}); // describe
