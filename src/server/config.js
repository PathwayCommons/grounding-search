import _ from 'lodash';

const env = (key, defaultVal) => {
  if( process.env[key] != null ){
    let val =  process.env[key];

    if( _.isNumber(defaultVal) ){
      val = parseFloat(val);
    }

    return val;
  } else {
    return defaultVal;
  }
};

export const PORT = env('PORT', 3000);

export const LOG_LEVEL = env('LOG_LEVEL', 'info');

export const ELASTICSEARCH_HOST = env('ELASTICSEARCH_HOST', 'localhost:9200');

export const MAX_SEARCH_ES = env('MAX_SEARCH_ES', 1000);
export const MAX_SEARCH_WS = env('MAX_SEARCH_WS', 100);
export const MAX_FUZZ_ES = env('MAX_FUZZ_ES', 2);
export const ES_MIN_SCORE = env('ES_MIN_SCORE', 0);

export const CHUNK_SIZE = env('ENTRIES_CHUNK_SIZE', 100);
export const MAX_SIMULT_CHUNKS = env('MAX_SIM_CHUNKS', 10);

export const INDEX = env('INDEX', 'groundingsearch');
export const INPUT_PATH = env('INPUT_PATH', 'input');

export const UNIPROT_FILE_NAME = env('UNIPROT_FILE_NAME', 'uniprot.xml');
export const UNIPROT_URL = env('UNIPROT_URL', 'ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.xml.gz');
export const DB_PREFIX_UNIPROT_KNOWLEDGEBASE = env('DB_PREFIX_UNIPROT_KNOWLEDGEBASE', 'uniprot');
export const DB_NAME_UNIPROT_KNOWLEDGEBASE = env('DB_NAME_UNIPROT_KNOWLEDGEBASE', 'UniProt Knowledgebase');

export const CHEBI_FILE_NAME = env('CHEBI_FILE_NAME', 'chebi.owl');
export const CHEBI_URL = env('CHEBI_URL', 'ftp://ftp.ebi.ac.uk/pub/databases/chebi/ontology/chebi.owl.gz');
export const DB_PREFIX_CHEBI = env('DB_PREFIX_CHEBI', 'CHEBI');
export const DB_NAME_CHEBI = env('DB_NAME_CHEBI', 'ChEBI');

export const NCBI_FILE_NAME = env('NCBI_FILE_NAME', 'ncbi');
export const NCBI_URL = env('NCBI_URL', 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene_info.gz');
export const NCBI_EUTILS_BASE_URL = env('NCBI_EUTILS_BASE_URL', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/');
export const NCBI_EUTILS_API_KEY = env('NCBI_EUTILS_API_KEY', 'b99e10ebe0f90d815a7a99f18403aab08008');
export const DB_PREFIX_NCBI_GENE = env('DB_PREFIX_NCBI_GENE', 'ncbigene');
export const DB_NAME_NCBI_GENE  = env('DB_NAME_NCBI_GENE', 'NCBI Gene');
export const DB_PREFIX_NCBI_PROTEIN = env('DB_PREFIX_NCBI_PROTEIN', 'ncbiprotein');
export const DB_NAME_NCBI_PROTEIN = env('DB_NAME_NCBI_PROTEIN', 'NCBI Protein');

export const DB_NAME_FAMPLEX  = env('DB_NAME_FAMPLEX', 'FamPlex');
export const DB_PREFIX_FAMPLEX = env('DB_PREFIX_FAMPLEX', 'fplx');
export const FAMPLEX_URL = env('FAMPLEX_URL', 'https://github.com/sorgerlab/famplex/archive/refs/heads/master.zip');
export const FAMPLEX_DIRNAME = env('FAMPLEX_DIRNAME', 'famplex-master');
export const FAMPLEX_FILE_NAME = env('FAMPLEX_FILE_NAME', 'famplex.json');
export const FAMPLEX_TYPE_FILTER = env('FAMPLEX_TYPE_FILTER', 'all');

export const DB_NAME_HGNC_SYMBOL = env('DB_NAME_HGNC_SYMBOL', 'HGNC Symbol');
export const DB_PREFIX_HGNC_SYMBOL = env('DB_PREFIX_HGNC_SYMBOL', 'hgnc.symbol');

export const ESDUMP_LOCATION = env('ESDUMP_LOCATION', './input/');
export const ZENODO_ACCESS_TOKEN = env('ZENODO_ACCESS_TOKEN', '');
export const ZENODO_BASE_URL = env('ZENODO_BASE_URL', 'https://zenodo.org/');
export const ZENODO_BUCKET_ID = env('ZENODO_BUCKET_ID', '');
export const ZENODO_DEPOSITION_ID = env('ZENODO_DEPOSITION_ID', '8096851');

export const SWAGGER_HOST = env('SWAGGER_HOST', 'localhost:3000'); // e.g. grounding.baderlab.org
