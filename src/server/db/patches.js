const patches = [
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
      'pp1a',
      'ORF1ab polyprotein',
      'pp1ab'
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
      'Non-structural protein 3'
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
      'Mpro'
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
      'RNA-dependent RNA polymerase'
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

const omissions = [
  {
    tax_id: '2697049',
    uids: [
      '1796318598', //S protein
      '1796318600', //E protein
      '1796318601', //M protein
      '1798174255', //N protein
      '1796318597', //ORF1ab protein
      '1826688918', // NSP1 pp1a
      '1826688919', // NSP2 pp1a
      '1826688920', // NSP3 pp1a
      '1826688921', // NSP4 pp1a
      '1826688922', // NSP5 pp1a
      '1826688923', // NSP6 pp1a
      '1826688924', // NSP7 pp1a
      '1802476812', // NSP8 pp1a
      '1826688926', // NSP9 pp1a
      '1826688927', // NSP10 pp1a
      '1796318599', //ORF3a protein
      '1796318602', // ORF6 protein
      '1796318603', //ORF7a protein
      '1820616061', //ORF7b protein
      '1796318604', //ORF8 protein
      '1798174256', //ORF10
    ]
  }
];

export { patches, omissions };
