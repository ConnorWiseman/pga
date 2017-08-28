/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai = require('chai');
chai.should();

// Require module to test.
const pga = require('../index.js');

// Describe tests.
describe('pga', function() {
  it('should export a function', function() {
    pga.should.be.a('function');
  });

  it('should return an object', function() {
    var db = pga({
      user:     'postgres',
      password: '',
      database: 'travis_ci_test',
      host:     'localhost',
      port:     5432,
      max:      10
    });

    db.should.be.an('object');
    db.close();
  });
});
