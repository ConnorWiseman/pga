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
const PostgreSQLAdapter = require('../lib/pga.js');

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

  // Obviously not ideal behavior.
  it('should do nothing when the pool emits an error', function() {
    db.pool.emit('error');
  });

  describe('#close', function() {
    it('should defer to `pool.end`', function() {
      sinon.stub(db.pool, 'end');
      db.close();
      db.pool.end.should.have.been.calledOnce;
    });
  });

  describe('#parallel', function() {
    it('should call `pool.connect`', function(done) {
      sinon.spy(db.pool, 'connect');
      db.parallel([
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        db.pool.connect.should.have.been.calledOnce;
      }).should.be.fulfilled.and.notify(done);
    });

    it('should handle connection errors', function(done) {
      sinon.stub(db.pool, 'connect').callsArgWith(0, 'connect error', null, () => {});
      db.parallel([
        { text: 'SELECT * FROM testing;' }
      ], function(error, result) {
        error.should.equal('connect error');
        done();
      });
    });

    it('should perform database queries', function(done) {
      db.parallel([
        { text: 'SELECT * FROM testing;' },
        { text: 'SELECT * FROM testing LIMIT 1;' },
        { text: 'SELECT * FROM testing LIMIT 2;' },
        { text: 'SELECT * FROM testing LIMIT 3;' },
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        results.length.should.equal(5);
      }).should.be.fulfilled.and.notify(done);
    });

    it('should return results in the proper order', function(done) {
      db.parallel([
        { text: 'SELECT * FROM testing;' },
        { text: 'SELECT * FROM testing LIMIT 1;' },
        { text: 'SELECT * FROM testing LIMIT 2;' },
        { text: 'SELECT * FROM testing LIMIT 3;' },
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        results[0].rows.length.should.equal(3);
        results[1].rows.length.should.equal(1);
        results[2].rows.length.should.equal(2);
        results[3].rows.length.should.equal(3);
        results[4].rows.length.should.equal(3);
      }).should.be.fulfilled.and.notify(done);
    });

    it('should return a Promise if callback is not a function', function(done) {
      db.parallel([
        { text: 'SELECT * FROM testing;' }
      ], 'not a function').should.be.fulfilled.and.notify(done);
    });

    it('should execute callback if provided', function(done) {
      db.parallel([
        { text: 'SELECT * FROM testing;' }
      ], done);
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

    it('should interpolate values demarcated by `$` character as string literals', function() {
      let id       = 1,
          table    = 'test',
          expected = 'SELECT * FROM test WHERE id = $1;';
      (db.sql`SELECT * FROM $${table} WHERE id = ${id};`.text).should.equal(expected);
    });

    it('should interpolate multiple values demarcated by `$` character as string literals', function() {
      let id       = 1,
          table    = 'test',
          expected = 'SELECT * FROM test t1 WHERE t1.id = $1 INNER JOIN test t2 ON t1.id = t2.id;';
      (db.sql`SELECT * FROM $${table} t1 WHERE t1.id = ${id} INNER JOIN $${table} t2 ON t1.id = t2.id;`.text).should.equal(expected);
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

    it('should handle connection errors', function(done) {
      sinon.stub(db.pool, 'connect').callsArgWith(0, 'connect error', null, () => {});
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ], function(error, result) {
        error.should.equal('connect error');
        done();
      });
    });

    it('should perform database queries', function(done) {
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ]).then(function(results) {
        results.length.should.equal(1);
        results[0].rows.length.should.equal(3);
      }).should.be.fulfilled.and.notify(done);
    });

    it('should rollback on `BEGIN` failure', function(done) {
      let client = {
        query: sinon.stub().callsArgWith(1, 'begin error')
      };
      sinon.stub(db.pool, 'connect').callsArgWith(0, null, client, () => {});
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ], function(error, result) {
        error.should.equal('begin error');
        done();
      });
    });

    it('should handle rollback errors', function(done) {
      let client = {
        query: sinon.stub()
          .onFirstCall().callsArgWith(1, 'begin error')
          .onSecondCall().callsArgWith(1, 'rollback error')
      };
      sinon.stub(db.pool, 'connect').callsArgWith(0, null, client, () => {});
      db.transact([
        { text: 'SELECT * FROM testing;' }
      ], function(error, result) {
        error.should.equal('rollback error');
        done();
      });
    });

    it('should rollback on `COMMIT` failure', function() {
      let client = {
        query: sinon.stub()
          .onFirstCall().callsArgWith(1, null)
          .onSecondCall().callsArgWith(2, null, {})
          .onThirdCall().callsArgWith(1, 'commit error')
      };
      sinon.stub(db.pool, 'connect').callsArgWith(0, null, client, () => {});

      db.transact([
        { text: 'SELECT * FROM testing;' }
      ]);
    });

    it('should rollback on query failure', function(done) {
      db.transact([
        { text: 'BAD SQL' }
      ]).should.be.rejected.and.notify(done);
    });

    it('should return a Promise if callback is not a function', function(done) {
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
