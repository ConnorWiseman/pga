/**
 * @file
 */
'use strict';


/**
 * Essentially, Array.reduce that asynchronously executes a callback function
 * for each element in the array before proceeding. Executes a second callback
 * function when the sequence is complete.
 * @param  {Array}    arr
 * @param  {Function} each
 * @param  {Function} done
 */
module.exports = function sequence(arr, each, done) {
  let accumulator = [],
      length = arr.length,
      index;

  (function next(arr, i) {
    index = i || 0;
    if (index < length) {
      process.nextTick(() => {
        each(accumulator, arr[index], ((arr, i) => {
          return function() {
            next(arr, i);
          };
        })(arr, ++index));
      });
    } else {
      process.nextTick(() => {
        done(accumulator);
      });
    }
  })(arr);
};
