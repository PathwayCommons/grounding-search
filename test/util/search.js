// name (search string) : grounding object { namespace, id }
const SEARCH_OBJECT = Object.freeze({

  // here are some common gene symbols to get started
  // https://www.nature.com/articles/d41586-017-07291-9
  'p53': { namespace: 'ncbi', id: '7157' },
  'tp53': { namespace: 'ncbi', id: '7157' },
  'brca2': { namespace: 'ncbi', id: '675' },
  'brca1': { namespace: 'ncbi', id: '672' },
  'tnf': { namespace: 'ncbi', id: '7124' },
  'egfr': { namespace: 'ncbi', id: '1956' },
  'vegfa': { namespace: 'ncbi', id: '7422' },
  'apoe': { namespace: 'ncbi', id: '348' },
  'il6': { namespace: 'ncbi', id: '3569' },
  'tgfb1': { namespace: 'ncbi', id: '7040' },
  'esr1': { namespace: 'ncbi', id: '2099' },
  'akt1': { namespace: 'ncbi', id: '207' },
  'hla-drb1': { namespace: 'ncbi', id: '3123' },
  'nfkb1': { namespace: 'ncbi', id: '4790' },
  'ace': { namespace: 'ncbi', id: '1636' },

  // an example chemical
  'aspirin': { namespace: 'chebi', id: '15365' }
});

export { SEARCH_OBJECT };
