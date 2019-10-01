/** @module server/util/promises */

/**
 * Run a function that returns a promise on the items of given array sequentially.
 * @param {array} arr Array of items to process.
 * @param {string} processItem The function that describes how to process each item.
 * @returns {Promise}
 */
export const seqPromise = function(arr, processItem) {
  return arr.reduce((p, item) => {
    return p.then(() => processItem(item));
  }, Promise.resolve()); // initial
};

export const seqOrFunctions = function(fcns) {
  let i = 0;

  const performNext = () => {
    if ( i == fcns.length ) {
      return Promise.resolve( null );
    }

    return fcns[i]().then( res => {
      if ( res != null ) {
        return Promise.resolve( res );
      }

      i++;
      return performNext();
    } );
  };

  return performNext();
};
