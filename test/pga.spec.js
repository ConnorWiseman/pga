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
    db = new PostgreSQLAdapter({
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

  describe('#sql', function() {
    it('should return an object', function() {
      (db.sql`TEST`).should.be.an('Object');
    });

    it('should return an object with keys `text` and `values`', function() {
      let query = db.sql`TEST`;
      query.should.have.all.keys('text', 'values');
    });

    it('should have key `text` as a string', function() {
      (db.sql`TEST`.text).should.be.a.string;
    });

    it('should have key `text` as the template literal with variables replaced', function() {
      let id = 1,
          expected = 'SELECT * FROM test WHERE id = $1;';
      (db.sql`SELECT * FROM test WHERE id = ${id};`.text).should.equal(expected);
    });

    it('should have key `values` as an array', function() {
      (db.sql`TEST`.values).should.be.an('Array');
    });

    it('should have key `values` as the variables passed to template literal', function() {
      let id = 1,
          expected = [ id ];
      (db.sql`SELECT * FROM test WHERE id = ${id};`.values).should.deep.equal(expected);

    });
  });
});
