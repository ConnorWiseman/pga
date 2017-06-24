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
      database: process.env.TEST_DB,
      host:     'localhost',
      port:     5432,
      max:      10
    });
  });

  afterEach(function() {
    db.close();
  });

  describe('#close', function() {
    it('should defer to `pool.end`', function() {
      sinon.stub(db.pool, 'end');
      db.close();
      db.pool.end.should.have.been.calledOnce;
    });
  });

  describe('#query', function() {
    it('should defer to `pool.query`', function() {
      sinon.stub(db.pool, 'query').callsFake(() => { return true; });
      db.query('TEST');
      db.pool.query.should.have.been.calledOnce;
    });

    it('should pass single string argument to `pool.query`', function() {
      sinon.stub(db.pool, 'query').callsFake(() => { return true; });
      db.query('TEST');
      db.pool.query.should.have.been.calledOnce;
      db.pool.query.should.have.been.calledWith('TEST');
    });

    it('should pass string and array to `pool.query`', function() {
      sinon.stub(db.pool, 'query').callsFake(() => { return true; });
      db.query('TEST', [ 1, 2, 3 ]);
      db.pool.query.should.have.been.calledOnce;
      db.pool.query.should.have.been.calledWith('TEST', [ 1, 2, 3 ]);
    });

    it('should pass parameterized SQL text/values object to `pool.query`', function() {
      sinon.stub(db.pool, 'query').callsFake(() => { return true; });
      db.query(db.sql`TEST`);
      db.pool.query.should.have.been.calledOnce;
      db.pool.query.should.have.been.calledWith({
        text:   'TEST',
        values: []
      });
    });
  });

  describe('#sql', function() {
    it('should return an object', function() {
      (db.sql`TEST`).should.be.an('Object');
    });

    it('should return an object with keys `text` and `values`', function() {
      let query = db.sql`TEST`;
      query.should.be.an('Object');
      query.should.have.all.keys('text', 'values');
    });

    it('should have key `text` as a string', function() {
      (db.sql`TEST`.text).should.be.a.string;
    });

    it('should have key `text` as the template literal with variables replaced', function() {
      let id       = 1,
          expected = 'SELECT * FROM test WHERE id = $1;';
      (db.sql`SELECT * FROM test WHERE id = ${id};`.text).should.equal(expected);
    });

    it('should have key `values` as an array', function() {
      (db.sql`TEST`.values).should.be.an('Array');
    });

    it('should have key `values` as the variables passed to template literal', function() {
      let id = 1;
      (db.sql`SELECT * FROM test WHERE id = ${id};`.values).should.deep.equal([ id ]);
    });
  });

  describe('#transact', function() {
    it('should call `pool.connect`', function(done) {
      sinon.spy(db.pool, 'connect');
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        db.pool.connect.should.have.been.calledOnce;
      }).should.be.fulfilled.and.notify(done);
    });

    it('should perform database queries', function(done) {
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        results.length.should.equal(1);
        results[0].rows.length.should.equal(3);
      }).should.be.fulfilled.and.notify(done);
    });

    it('should rollback on failure', function(done) {
      db.transact([
        { text: 'BAD SQL' }
      ]).should.be.rejected.and.notify(done);
    });

    it('should ensure callback is a function', function(done) {
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ], 'not a function').should.be.fulfilled.and.notify(done);
    });

    it('should execute callback if provided', function(done) {
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ], done);
    });
  });
});
