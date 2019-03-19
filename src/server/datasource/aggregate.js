const db = require('../db');

const search = function(searchString){
  // for now no sorting...

  // something more sophisticated could be done later
  return db.search(searchString);
};

const get = function(namespace, id){
  return db.get(id, namespace);
};

module.exports = { search, get };
