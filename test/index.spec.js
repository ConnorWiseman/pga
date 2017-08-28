/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
const sql            = require('pga-sql');
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

// Require module to test.
const pga = require('../index.js');

// Describe tests.
describe('PostgreSQLAdapter', function() {
  var db;

  beforeEach(function() {
    db = pga({
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
        'SELECT * FROM testing;'
      ], function(error, result) {
        error.should.equal('connect error');
        done();
      });
    });

    it('should perform database queries', function(done) {
      db.parallel([
        'SELECT * FROM testing;',
        'SELECT * FROM testing LIMIT 1;',
        'SELECT * FROM testing LIMIT 2;',
        'SELECT * FROM testing LIMIT 3;',
        'SELECT * FROM testing;'
      ]).then(function(results) {
        results.length.should.equal(5);
      }).should.be.fulfilled.and.notify(done);
    });

    it('should return results in the proper order', function(done) {
      db.parallel([
        'SELECT * FROM testing;',
        'SELECT * FROM testing LIMIT 1;',
        'SELECT * FROM testing LIMIT 2;',
        'SELECT * FROM testing LIMIT 3;',
        'SELECT * FROM testing;'
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
        'SELECT * FROM testing;'
      ], 'not a function').should.be.fulfilled.and.notify(done);
    });

    it('should execute callback if provided', function(done) {
      db.parallel([
        'SELECT * FROM testing;'
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
      db.query(sql`TEST`);
      db.pool.query.should.have.been.calledOnce;
      db.pool.query.should.have.been.calledWith({
        text:   'TEST',
        values: []
      });
    });
  });

  describe('#transact', function() {
    it('should call `pool.connect`', function(done) {
      sinon.spy(db.pool, 'connect');
      db.transact([
        'SELECT * FROM testing;'
      ]).then(function(results) {
        db.pool.connect.should.have.been.calledOnce;
      }).should.be.fulfilled.and.notify(done);
    });

    it('should handle connection errors', function(done) {
      sinon.stub(db.pool, 'connect').callsArgWith(0, 'connect error', null, () => {});
      db.transact([
        'SELECT * FROM testing;'
      ], function(error, result) {
        error.should.equal('connect error');
        done();
      });
    });

    it('should perform database queries', function(done) {
      db.transact([
        'SELECT * FROM testing;'
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
        'SELECT * FROM testing;'
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
        'SELECT * FROM testing;'
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
        'SELECT * FROM testing;'
      ]);
    });

    it('should rollback on query failure', function(done) {
      db.transact([
        'BAD SQL'
      ]).should.be.rejected.and.notify(done);
    });

    it('should return a Promise if callback is not a function', function(done) {
      db.transact([
        'SELECT * FROM testing;'
      ], 'not a function').should.be.fulfilled.and.notify(done);
    });

    it('should execute callback if provided', function(done) {
      db.transact([
        'SELECT * FROM testing;'
      ], done);
    });
  });
});
