import { famplex } from './famplex.js';

// famplex.preProcess()
//   .then( d => {
//     console.log( `length: ${d.length}` );
//   });

famplex.download()
  .then( () => {
    console.log( `ok` );
  });