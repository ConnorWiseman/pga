/**
 * @file Exports the PostgreSQLAdapter class.
 */
'use strict';

// Required Node.js modules.
const Pool    = require('pg').Pool;
const Promise = require('bluebird');

// Required project modules.
const sequence = require('./sequence.js');


/**
 * Using the specified connection pool, performs a series of specified queries
 * using any specified parameters in sequence, finally executing a specified
 * callback function with any error or result. Will automatically rollback the
 * transaction if it fails and commit if it succeeds.
 * @param  {BoundPool}      pool
 * @param  {Array.<Object>} queries
 * @param  {Function}       callback
 * @private
 */
function performTransaction(pool, queries, callback) {
  pool.connect((error, client, done) => {
    if (error) {
      done(client);
      return callback(error, null);
    }

    client.query('BEGIN', error => {
      if (error) {
        return rollback(client, done, error, callback);
      }

      sequence(queries, (results, current, next) => {
        let query  = current.query,
            params = current.params || [];

        client.query(query, params, (error, result) => {
          if (error) {
            return rollback(client, done, error, callback);
          }

          results.push(result);
          next();
        });
      }, (results) => {
        client.query('COMMIT', error => {
          if (error) {
            return rollback(client, done, error, callback);
          }

          done(client);
          return callback(null, results);
        });
      });
    });
  });
};


/**
 * @class Creates a PostgreSQL connection pool and exports utility methods for
 *        performing queries from pooled connections. Methods support both
 *        callback and Promise patterns.
 */
let PostgreSQLAdapter = module.exports = class PostgreSQLAdapter {


  /**
   * @param {Object} config
   * @constructor
   */
  constructor(config) {

    /**
     * @type {BoundPool}
     */
    this.pool = new Pool(config);

    this.pool.on('error', (error, client) => {

    });
  }


  /**
   * Closes the connection pool.
   * @public
   */
  close() {
    return this.pool.end.apply(this.pool, arguments);
  }


  /**
   * Performs a basic query using the pg-pool module's #query method.
   * @param  {String}   query
   * @param  {Array}    [params]   Optional.
   * @param  {Function} [callback] Optional.
   * @return {*}
   * @public
   * @example
   *    const pga = require('pga');
   *    let db = pga(config);
   *
   *    db.query('SELECT * FROM test;', function(error, result) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(result);
   *    });
   *
   *    db.query('SELECT * FROM test;').then(function(result) {
   *      console.log(result);
   *    }).catch(
   *      console.error(error);
   *    });
   *
   *    db.query('SELECT * FROM test WHERE name = $1::text;', ['testing'], function(error, result) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(result);
   *    });
   *
   *    db.query('SELECT * FROM test WHERE name = $1::text;', ['testing']).then(function(result) {
   *      console.log(result);
   *    }).catch(function(error) {
   *      console.error(error);
   *    });
   */
  query(query, params, callback) {
    return this.pool.query.apply(this.pool, arguments);
  }


  /**
   * Performs a database transaction, or a sequential set of SQL queries. The
   * callback is optional, and if no callback is provided, #transact will
   * return a Promise object.
   * @param  {Array.<Object>} queries
   * @param  {Function}       [callback] Optional.
   * @return {*}
   * @public
   * @example
   *    const pga = require('pga');
   *    let db = pga(config);
   *
   *    db.transact([
   *      { query: 'SELECT COUNT(*) FROM test;' },
   *      { query: 'SELECT * FROM test WHERE id = $1::int;', params: [ 1 ] },
   *      { query: 'INSERT INTO test (name) VALUES ($1:text);', params: [ 'Name!' ] },
   *      { query: 'SELECT COUNT(*) FROM test;' }
   *    ], function(error, results) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(results);
   *    });
   *
   *    db.transact([
   *      { query: 'SELECT COUNT(*) FROM test;' },
   *      { query: 'SELECT * FROM test WHERE id = $1::int;', params: [ 1 ] },
   *      { query: 'INSERT INTO test (name) VALUES ($1:text);', params: [ 'Name!' ] },
   *      { query: 'SELECT COUNT(*) FROM test;' }
   *    ]).then(function(results) {
   *      console.log(results);
   *    }).catch(function(error) {
   *      console.error(error);
   *    });
   */
  transact(queries, callback) {
    if (callback && typeof callback === 'function') {
      return performTransaction(this.pool, queries, callback);
    }

    return new Promise((resolve, reject) => {
      performTransaction(this.pool, queries, (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      });
    });
  }
};
