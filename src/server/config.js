const env = (key, defaultVal) => process.env[key] != null ? process.env[key] : defaultVal;

export const PORT = env('PORT', 3000);

export const LOG_LEVEL = env('LOG_LEVEL', 'info');

export const MAX_SEARCH_ES = env('MAX_SEARCH_ES', 1000);
export const MAX_SEARCH_WS = env('MAX_SEARCH_WS', 100);

export const INDEX = env('INDEX', 'groundingsearch');
export const INPUT_PATH = env('INPUT_PATH', 'input');

export const UNIPROT_FILE_NAME = env('UNIPROT_FILE_NAME', 'uniprot.xml');
export const UNIPROT_URL = env('UNIPROT_URL', 'ftp://ftp.uniprot.org/pub/databases/uniprot/current_release/knowledgebase/complete/uniprot_sprot.xml.gz');

export const CHEBI_FILE_NAME = env('CHEBI_FILE_NAME', 'chebi.owl');
export const CHEBI_URL = env('CHEBI_URL', 'ftp://ftp.ebi.ac.uk/pub/databases/chebi/ontology/chebi.owl.gz');

export const NCBI_FILE_NAME = env('NCBI_FILE_NAME', 'ncbi');
export const NCBI_URL = env('NCBI_URL', 'ftp://ftp.ncbi.nih.gov/gene/DATA/gene_info.gz');
