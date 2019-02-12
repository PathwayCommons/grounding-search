// TODO

const update = function(){
  // TODO import from xml to elasticsearch
  console.log('uniprot.update()');

  return Promise.resolve();
};

const clear = function(){
  // TODO clear all uniprot data from elasticsearch
  console.log('uniprot.clear()');

  return Promise.resolve();
};

const search = function(searchString){
  // TODO resolve a promise with all "close" matches with searchString
  console.log('uniprot.search()');

  return Promise.resolve([]);
};

module.exports = { update, clear, search };