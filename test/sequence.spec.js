/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai = require('chai');
chai.should();

// Require module to test.
const sequence = require('../src/sequence.js');

// Describe tests.
describe('sequence', function() {
  it('should export a function', function() {
    sequence.should.be.a('function');
  });

  it('should iterate over an array', function(done) {
    var arr = [ 1, 2, 3, 4, 5 ],
        i   = 0;

    sequence(arr, function(results, current, next) {
      current.should.equal(arr[i]);
      i++;
      next();
    }, function(results) {
      done();
    });
  });

  it('should mutate results', function(done) {
    var arr = [ 1, 2, 3, 4, 5 ];

    sequence(arr, function(results, current, next) {
      results.push(current * 2);
      next();
    }, function(results) {
      results.should.deep.equal([2, 4, 6, 8, 10]);
      done();
    });
  });
});
