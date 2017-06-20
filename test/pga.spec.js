/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

// Require module to test.
const PostgreSQLAdapter = require('../src/pga.js');

// Describe tests.
describe('PostgreSQLAdapter', function() {
  var db;

  beforeEach(function() {
    db = pga({
      user:     'postgres',
      password: '',
      database: 'travis_ci_test',
      host:     'localhost',
      port:     5432,
      max:      10
    });
  });

  afterEach(function() {
    db.close();
  });
});
