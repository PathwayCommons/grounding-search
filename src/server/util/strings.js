/**
 * Returns the nth node in str, where the nodes are splited by the delimiter,
 * assuming that no adjacent occurance of the delimiter exists
 * @param {string} str String to seek the nth node.
 * @param {string} delimiter Delimiter that seperates the nodes.
 * @param {number} n Index of node to seek.
 */
const nthStrNode = ( str, delimiter, n ) => {
  let i = 0;
  let start = 0;
  while ( start != -1 && i < n ) {
    start = str.indexOf( delimiter, start ) + 1;
    i ++;
  }

  let end = str.indexOf( delimiter, start );

  // if there is no more occurance of the delimiter go until the end of str
  if ( end == -1 ) {
    end = undefined;
  }

  let node = str.substring( start, end );
  return node;
};

module.exports = { nthStrNode };
