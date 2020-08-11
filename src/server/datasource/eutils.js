import _ from 'lodash';
import queryString from 'query-string';
import fetch from 'node-fetch';
import { NCBI_EUTILS_BASE_URL, NCBI_EUTILS_API_KEY } from '../config';

const checkHTTPStatus = response => {
  const { statusText, status, ok } = response;
  if ( !ok ) {
    throw new Error( `${statusText} (${status})`, status, statusText );
  }
  return response;
};

const checkEsummaryResult = json => {
  const errorMessage =  _.get( json, ['esummaryresult', '0'] );
  if( errorMessage ) throw new Error( errorMessage );
  return json;
};

const checkEsearchResult = json => {
  const errorMessage =  _.get( json, ['esearchresult', 'ERROR'] );
  if( errorMessage ) throw new Error( errorMessage );
  return json;
};

const EUTILS_ESUMMARY_URL = NCBI_EUTILS_BASE_URL + 'esummary.fcgi';
const DEFAULT_ESUMMARY_PARAMS = {
  id: undefined,
  db: 'protein',
  retstart: 1,
  retmode: 'json',
  retmax: 10000,
  query_key: undefined,
  WebEnv: undefined,
  api_key: NCBI_EUTILS_API_KEY
};

/**
 * eSummary
 * Wrapper for the ESUMMARY EUTILITY {@link https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESummary|ESUMMARY docs }
 *
 * @param { Object } opts EUTILS ESUMMARY options
 * @returns { Object } The esearch results
 * @throws { Error } based on HTTP status and ESUMMARY result
 */
const eSummary = opts => {
  const params = _.assign( {}, DEFAULT_ESUMMARY_PARAMS, opts );
  const url = EUTILS_ESUMMARY_URL + '?' + queryString.stringify( params );
  const userAgent = `${process.env.npm_package_name}/${process.env.npm_package_version}`;
  return fetch( url, {
    method: 'GET',
    headers: {
      'User-Agent': userAgent
    }
  })
    .then( checkHTTPStatus ) // HTTPStatusError
    .then( response => response.json() )
    .then( checkEsummaryResult ); // Error (programmatic)
};

const EUTILS_SEARCH_URL = NCBI_EUTILS_BASE_URL + 'esearch.fcgi';
const DEFAULT_ESEARCH_PARAMS = {
  term: undefined,
  db: 'protein',
  rettype: 'uilist',
  retmode: 'json',
  retmax: 10000,
  usehistory: 'y',
  field: undefined,
  idtype: undefined,
  api_key: NCBI_EUTILS_API_KEY
};

/**
 * eSearch
 * Wrapper for the ESEARCH EUTILITY {@link https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch|EUTILS docs }
 *
 * @param { Object } opts EUTILS ESEARCH options
 * @returns { Object } The esearch results
 * @throws { Error } based on HTTP status and ESEARCH result
 */
const eSearch = opts => {
  const params = _.assign( {}, DEFAULT_ESEARCH_PARAMS, opts );
  const url = EUTILS_SEARCH_URL + '?' + queryString.stringify( params );
  const userAgent = `${process.env.npm_package_name}/${process.env.npm_package_version}`;
  return fetch( url, {
    method: 'GET',
    headers: {
      'User-Agent': userAgent
    }
  })
    .then( checkHTTPStatus ) // HTTPStatusError
    .then( response => response.json() )
    .then( checkEsearchResult ); // Error (programmatic)
};

/**
 * eSearchSummaries
 * Wrapper for piping  ESEARCH result into ESUMMARY
 *
 * @param { Object } opts EUTILS ESEARCH options
 * @returns { Object } The eSummary results
 * @throws { Error } based on HTTP status and ESEARCH/ESUMMARY result
 */
const eSearchSummaries = opts => {
  const pickHhistoryOpts = eutilResponse => {
    const esearchresult = _.get( eutilResponse, ['esearchresult'] );
    return _.pick(  esearchresult, ['querykey', 'webenv'] );
  };

  return eSearch( opts )
    .then( pickHhistoryOpts )
    .then( ({ webenv, querykey }) => eSummary({ query_key: querykey, WebEnv: webenv }) );
};

export { eSearch, eSummary, eSearchSummaries };