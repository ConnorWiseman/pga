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
const sql = require('../index.js').sql;

// Describe tests.
describe('#sql', function() {
  describe('#sql', function() {
    it('should return an object', function() {
      (sql`TEST`).should.be.an('Object');
    });

    it('should return an object with keys `text` and `values`', function() {
      let query = sql`TEST`;
      query.should.be.an('Object');
      query.should.have.all.keys('text', 'values');
    });

    it('should have key `text` as a string', function() {
      (sql`TEST`.text).should.be.a.string;
    });

    it('should have key `text` as the template literal with variables replaced', function() {
      let id       = 1,
          expected = 'SELECT * FROM test WHERE id = $1;';
      (sql`SELECT * FROM test WHERE id = ${id};`.text).should.equal(expected);
    });

    it('should interpolate values demarcated by `$` character as string literals', function() {
      let id       = 1,
          table    = 'test',
          expected = 'SELECT * FROM test WHERE id = $1;';
      (sql`SELECT * FROM $${table} WHERE id = ${id};`.text).should.equal(expected);
    });

    it('should interpolate multiple values demarcated by `$` character as string literals', function() {
      let id       = 1,
          table    = 'test',
          expected = 'SELECT * FROM test t1 WHERE t1.id = $1 INNER JOIN test t2 ON t1.id = t2.id;';
      (sql`SELECT * FROM $${table} t1 WHERE t1.id = ${id} INNER JOIN $${table} t2 ON t1.id = t2.id;`.text).should.equal(expected);
    });

    it('should have key `values` as an array', function() {
      (sql`TEST`.values).should.be.an('Array');
    });

    it('should have key `values` as the variables passed to template literal', function() {
      let id = 1;
      (sql`SELECT * FROM test WHERE id = ${id};`.values).should.deep.equal([ id ]);
    });
  });
});
