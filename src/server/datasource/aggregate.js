const uniprot = require('./uniprot');
const sources = [uniprot];
const _ = require('lodash');

const search = function(searchString){
  const sourceSearch = source => source.search(searchString);

  // for now, just concat the results together --- no sorting...

  // something more sophisticated could be done later
  return Promise.all(sources.map(sourceSearch)).then(_.concat);
};

// eslint-disable-next-line
const get = function(namespace, id){
  // TODO
};

module.exports = { search, get };
