// name (search string) : grounding object { namespace, id }
const SEARCH_OBJECT = Object.freeze({
  // Yang et al. Molecular Cell, Volume 53, Issue 1, 9 January 2014, Pages 88-100
  'hypoxia': null,
  'HIF-1 alpha': { namespace: 'uniprot', id: 'Q16665' }, // example grounding
  'vhl': { namespace: 'uniprot', id: 'P40337' },
  // Jin et al. Molecular Cell, Volume 69, Issue 1, 4 January 2018, Pages 87-99
  'plag1': { namespace: 'uniprot', id: 'Q6DJT9' },
  'gdh1': { namespace: 'uniprot', id: 'P00367' },
  'alpha keto': { namespace: 'chebi', id: 'CHEBI:30915' },
  'camkk2': { namespace: 'uniprot', id: 'Q96RR4' },
  'AMPK alpha': { namespace: 'uniprot', id: 'Q13131' },
  'mTOR': { namespace: 'uniprot', id: 'P42345' },
  'Anoikis': null, // Process
  'LKB1': { namespace: 'uniprot', id: 'Q15831' },
  // He et al. Molecular Cell, Volume 70, Issue 5, 7 June 2018, Pages 949-960
  'mTORC1': null, // Complex
  'GSK3': { namespace: 'uniprot', id: 'P49840' }, // alternative P49841
  'Foxk1': { namespace: 'uniprot', id: 'P85037' },
  '14-3-3 sigma': { namespace: 'uniprot', id: 'P31947' },
  // Liu et al. Molecular Cell, Volume 65, Issue 1, 6 April 2017, Pages 117-128
  'CRPK1': { namespace: 'uniprot', id: 'Q93YN1' },
  '14-3-3 lambda': { namespace: 'uniprot', id: 'P48349' },
  'CBF1': { namespace: 'uniprot', id: 'P93835' },
  'CBF3': { namespace: 'uniprot', id: 'Q9M0L0' },
  'RD29A': { namespace: 'uniprot', id: 'Q06738' },
  'COR15B': { namespace: 'uniprot', id: 'Q9SIN5' },
  'KIN1': { namespace: 'uniprot', id: 'P18612' },
  // Qian et al. Molecular Cell, Volume 65, Issue 5, 2017, pp917-931
  'VPS34': { namespace: 'uniprot', id: 'Q8NEB9' },
  'ATG14L': { namespace: 'uniprot', id: 'Q6ZNE5' },
  'PI(3)P': { namespace: 'chebi', id: 'CHEBI:26034' },
  // Clarke et al. Molecular Cell, Volume 65, Issue 5, 2017, pp900-916
  'PRMT5': { namespace: 'uniprot', id: 'O14744' },
  'TIP60': null, // Complex
  '53BP1': { namespace: 'uniprot', id: 'Q12888' },
  'RIG-I': { namespace: 'uniprot', id: 'O95786' },
  'MAVS': { namespace: 'uniprot', id: 'Q7Z434' },
  'TBK1': { namespace: 'uniprot', id: 'Q9UHD2' },
  'IRF3': { namespace: 'uniprot', id: '	Q14653' },
  'IFN beta': { namespace: 'uniprot', id: 'P01574' },
  'DAPK1': { namespace: 'uniprot', id: 'P53355' },
  // Godfrey et al. Molecular Cell Volume 65, Issue 3, 2017, Pages 393-402
  // Unsupported organisms
  'cdc55': { namespace: 'uniprot', id: 'Q00362' },
  'swe1': { namespace: 'uniprot', id: 'P32944' },
  'cdc28': { namespace: 'uniprot', id: 'P00546' },
  'ask1': { namespace: 'uniprot', id: 'P35734' },
  'net1': { namespace: 'uniprot', id: 'P47035' },
  // Jeong et al. Molecular Cell Volume 65, Issue 1, 2017, Pages 154-167
  'IKK': null, // Complex
  'IkBalpha': { namespace: 'uniprot', id: 'O15111' },
  'NF-kB': null, //family
  'miR-196b-3p': null, // RNA
  'CRPC': null, // Disease
  'Meis2': { namespace: 'uniprot', id: 'O14770' },
  'PP2B': null, // calcineurin -P48454/Q08209/P16298
  'Sox2': { namespace: 'uniprot', id: 'P48431' },
  'Oct4': { namespace: 'uniprot', id: 'Q01860' },
  'Nanog': { namespace: 'uniprot', id: 'Q9H9S0' },
  'Twist': { namespace: 'uniprot', id: 'Q15672' }
});

module.exports = { SEARCH_OBJECT };
