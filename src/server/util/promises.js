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
