import _ from 'lodash';

const PATCHES_TAXID_2697049 = [
  {
    namespace: 'ncbi',
    id: '43740568',
    addSynonyms: [
      'spike',
      'spike protein',
      'S glycoprotein',
      'Spike protein S1',
      'Spike protein S2',
      'Spike protein S2\'',
      'E2',
      'Peplomer protein',
      'surface glycoprotein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740570',
    addSynonyms: [
      'envelope',
      'envelope protein',
      'sM protein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740571',
    addSynonyms: [
      'membrane',
      'membrane protein',
      'membrane glycoprotein',
      'E1 glycoprotein',
      'Matrix glycoprotein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740575',
    addSynonyms: [
      'nucleocapsid',
      'nucleocapsid protein',
      'nucleocapsid phosphoprotein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740578',
    addSynonyms: [
      'ORF1a polyprotein',
      'ORF1ab polyprotein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476803',
    addSynonyms: [
      'ORF1a',
      'ORF1a polyprotein',
      'pp1a',
      'Replicase polyprotein 1a'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1796318597',
    addSynonyms: [
      'ORF1ab',
      'ORF1ab polyprotein',
      'pp1ab',
      'Replicase polyprotein 1ab',
      'ORF1b'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476805',
    addSynonyms: [
      'NSP1',
      'Non-structural protein 1',
      'leader protein',
      'Host translation inhibitor nsp1'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476806',
    addSynonyms: [
      'NSP2',
      'Non-structural protein 2'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476807',
    addSynonyms: [
      'NSP3',
      'Non-structural protein 3',
      'PL2-PROPapain-like proteinase',
      'PLpro'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476808',
    addSynonyms: [
      'NSP4',
      'Non-structural protein 4'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476809',
    addSynonyms: [
      'NSP5',
      '3C-like proteinase',
      'Non-structural protein 5',
      'Mpro',
      '3CLpro'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476810',
    addSynonyms: [
      'NSP6',
      'Non-structural protein 6'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476811',
    addSynonyms: [
      'NSP7',
      'Non-structural protein 7'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476812',
    addSynonyms: [
      'NSP8',
      'Non-structural protein 8'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476813',
    addSynonyms: [
      'NSP9',
      'Non-structural protein 9'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476814',
    addSynonyms: [
      'NSP10',
      'Non-structural protein 10'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476820',
    addSynonyms: [
      'NSP11',
      'Non-structural protein 11'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476815',
    addSynonyms: [
      'NSP12',
      'Non-structural protein 12',
      'RNA-dependent RNA polymerase',
      'RdRp'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476816',
    addSynonyms: [
      'NSP13',
      'Non-structural protein 13',
      'helicase'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476817',
    addSynonyms: [
      'NSP14',
      '3\'-to-5\' exonuclease',
      'Non-structural protein 14'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476818',
    addSynonyms: [
      'NSP15',
      'endoRNAse',
      'Non-structural protein 15'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1802476819',
    addSynonyms: [
      'NSP16',
      '2\'-O-ribose methyltransferase',
      'Non-structural protein 16'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740569',
    addSynonyms: [
      'ORF3a protein',
      'Accessory protein 3a',
      'Protein 3a',
      'Protein U274',
      'Protein X1'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740572',
    addSynonyms: [
      'ORF6 protein',
      'Accessory protein 6',
      'Non-structural protein 6 (ns6)',
      'Protein X3'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740573',
    addSynonyms: [
      'ORF7a protein',
      'Accessory protein 7a',
      'Protein U122',
      'Protein X4'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740574',
    addSynonyms: [
      'ORF7b protein',
      'Accessory protein 7b'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740577',
    addSynonyms: [
      'ORF8 protein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '43740576',
    addSynonyms: [
      'ORF10 protein'
    ]
  }
];

const PATCHES_TAXID_227984 = [
  {
    namespace: 'ncbi',
    id: '1489668',
    addSynonyms: [
      'spike',
      'spike protein',
      'S glycoprotein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1489678',
    addSynonyms: [
      'ORF9a',
      'ORF9a protein',
      'nucleocapsid',
      'nucleocapsid protein'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1489680',
    addSynonyms: [
      'ORF1ab polyprotein',
      'pp1ab',
      'polyprotein pp1ab',
      'replicase 1AB'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1489671',
    addSynonyms: [
      'envelope protein',
    ]
  },
  {
    namespace: 'ncbi',
    id: '1489669',
    addSynonyms: [
      'sars3a'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1489679',
    addSynonyms: [
      'ORF9b'
    ]
  },
  {
    namespace: 'ncbi',
    id: '34555774',
    addSynonyms: [
      'NSP1',
      'Non-structural protein 1',
    ]
  },
  {
    namespace: 'ncbi',
    id: '34555775',
    addSynonyms: [
      'NSP2',
      'Non-structural protein 2'
    ]
  },
  {
    namespace: 'ncbi',
    id: '34555776',
    addSynonyms: [
      'NSP3',
      'Non-structural protein 3'
    ]
  },
  {
    namespace: 'ncbi',
    id: '34555778',
    addSynonyms: [
      'NSP4',
      'Non-structural protein 4'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837498',
    addSynonyms: [
      'NSP5',
      'Non-structural protein 5'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837499',
    addSynonyms: [
      'NSP6',
      'Non-structural protein 6'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837500',
    addSynonyms: [
      'NSP7',
      'Non-structural protein 7'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837501',
    addSynonyms: [
      'NSP8',
      'Non-structural protein 8'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837502',
    addSynonyms: [
      'NSP9',
      'Non-structural protein 9'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837503',
    addSynonyms: [
      'NSP10',
      'Non-structural protein 10'
    ]
  },
  {
    namespace: 'ncbi',
    id: '1904811885',
    addSynonyms: [
      'NSP12',
      'Non-structural protein 12'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837505',
    addSynonyms: [
      'NSP13',
      'Non-structural protein 13'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837506',
    addSynonyms: [
      'NSP14',
      'Non-structural protein 14'
    ]
  },
  {
    namespace: 'ncbi',
    id: '29837507',
    addSynonyms: [
      'NSP15',
      'Non-structural protein 15'
    ]
  },
  {
    namespace: 'ncbi',
    id: '30133975',
    addSynonyms: [
      'NSP16',
      'Non-structural protein 16'
    ]
  }
];

const omissions = [
  {
    namespace: 'ncbi',
    tax_id: '2697049',
    uids: [
      '1796318598', //S protein
      '1796318600', //E protein
      '1796318601', //M protein
      '1798174255', //N protein
      '1826688918', // NSP1 pp1a
      '1826688919', // NSP2 pp1a
      '1826688920', // NSP3 pp1a
      '1826688921', // NSP4 pp1a
      '1826688922', // NSP5 pp1a
      '1826688923', // NSP6 pp1a
      '1826688924', // NSP7 pp1a
      '1826688925', // NSP8 pp1a
      '1826688926', // NSP9 pp1a
      '1826688927', // NSP10 pp1a
      '1796318599', //ORF3a protein
      '1796318602', // ORF6 protein
      '1796318603', //ORF7a protein
      '1820616061', //ORF7b protein
      '1796318604', //ORF8 protein
      '1798174256', //ORF10
    ]
  },
  {
    namespace: 'ncbi',
    tax_id: '227984',
    uids: [
      '1845982719', //S protein
      '1845982722', //E protein
      '1845982723', //M protein
      '1845982729', //N protein
      '1873624195', //ORF1ab protein
      '1845982720', //ORF3a protein
      '1845982721', //ORF3b protein
      '1845982724', //ORF6  protein
      '1845982725', //ORF7a protein
      '1845982726', //ORF7b protein
      '1845982727', //ORF8a protein
      '1845982728', //ORF8b protein
      '1845982731', //ORF9a protein
      '1845982730', //ORF9b protein
    ]
  }
];

const patches = _.concat( [], PATCHES_TAXID_2697049, PATCHES_TAXID_227984 );

export { patches, omissions };
