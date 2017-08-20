/**
 * @file Exports the PostgreSQLAdapter class.
 */
'use strict';

// Required Node.js modules.
const Pool     = require('pg').Pool;
const Promise  = require('bluebird');
const sequence = require('seqnce');


/**
 * Using the specified connection pool, performs the specified function using
 * a series of queries and a user-defined callback function.
 * @param  {BoundPool}      pool
 * @param  {Function}       fn
 * @param  {Array.<Object>} queries
 * @param  {Function}       callback
 * @private
 */
function multiple(pool, fn, queries, callback) {
  if (callback && typeof callback === 'function') {
    return fn(pool, queries, callback);
  }

  return new Promise((resolve, reject) => {
    fn(pool, queries, (error, result) => {
      if (error) {
        return reject(error);
      }

      resolve(result);
    });
  });
};


/**
 * Using the specified connection pool, performs a series of specified queries
 * in parallel, executing a specified callback function once all queries have
 * successfully completed.
 * @param  {BoundPool}      pool
 * @param  {Array.<Object>} queries
 * @param  {Function}       callback
 * @private
 */
function performParallel(pool, queries, callback) {
  let count   = 0,
      results = new Array(queries.length);

  queries.forEach((query, index) => {
    pool.query(query, (error, result) => {
      if (error) {
        return callback(error, results);
      }

      results[index] = result;

      if (++count === queries.length) {
        return callback(null, results);
      }
    });
  });
};


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
        let query  = current.text,
            params = current.values || [];

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
 * Rolls back any failed transaction.
 * @param  {Client}   client
 * @param  {Function} done
 * @param  {Error}    error
 * @param  {Function} callback
 * @private
 */
function rollback(client, done, error, callback) {
  client.query('ROLLBACK', rollbackError => {
    done(rollbackError);
    return callback(rollbackError || error, null);
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
   * Performs a series of database queries in parallel over a multiple client
   * connections to optimize performance, returning results after all the
   * queries have finished execution. The callback is optional, and if no
   * callback is provided, #parallel will return a Promise object. An error
   * in any one of the queries will result in the immediate termination of
   * the function, yielding the execution of the callback with an error and
   * a potential partial array of results from other successful queries. When
   * used to return a Promise object, the Promise will be rejected on the
   * first error without exposing any completed results.
   *
   * It is not safe to use #parallel with queries that may have an impact on
   * the database.
   * @param  {Array.<Object>} queries
   * @param  {Function}       [callback] Optional.
   * @return {*}
   * @public
   * @example
   *    const pga = require('pga');
   *    let db = pga(config);
   *
   *    db.parallel([
   *      { text: 'SELECT COUNT(*) FROM test;' },
   *      { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
   *      { text: 'SELECT * FROM test;' }
   *    ], function(error, results) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(results);
   *    });
   *
   *    db.parallel([
   *      { text: 'SELECT COUNT(*) FROM test;' },
   *      { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
   *      { text: 'SELECT * FROM test;' }
   *    ]).then(function(results) {
   *      console.log(results);
   *    }).catch(function(error) {
   *      console.error(error);
   *    });
   */
  parallel(queries, callback) {
    return multiple(this.pool, performParallel, queries, callback);
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
   * A template tag function that returns an object compatible with the query
   * function in the node-postgres library.
   *
   * @param  {Array.<String>} strings
   * @param  {...*}           [keys]
   * @return {Object}
   * @public
   * @see {@link https://github.com/brianc/node-postgres/blob/master/lib/query.js#L21}
   * @example
   *    const pga = require('pga');
   *    let db = pga(config);
   *
   *    let id = 1;
   *
   *    db.query(db.sql`SELECT * FROM test WHERE id = ${id}`, function(error, result) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(result);
   *    });
   */
   sql(strings, ...keys) {
     let params = keys.slice(),
         offset = 0;

     return {
       text: strings.reduce((sql, frag, i) => {
         if (sql.charAt(sql.length - 1) === '$') {
           return sql.slice(0, -1) + params.splice(i - ++offset, 1)[0] + frag;
         }

         return sql + '$' + (i - offset) + frag;
       }).replace(/\s+/g, ' '),

       values: params
     };
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
   *      { text: 'SELECT COUNT(*) FROM test;' },
   *      { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
   *      { text: 'INSERT INTO test (name) VALUES ($1:text);', values: [ 'Name!' ] },
   *      { text: 'SELECT COUNT(*) FROM test;' }
   *    ], function(error, results) {
   *      if (error) {
   *        return console.error(error);
   *      }
   *      console.log(results);
   *    });
   *
   *    db.transact([
   *      { text: 'SELECT COUNT(*) FROM test;' },
   *      { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
   *      { text: 'INSERT INTO test (name) VALUES ($1:text);', values: [ 'Name!' ] },
   *      { text: 'SELECT COUNT(*) FROM test;' }
   *    ]).then(function(results) {
   *      console.log(results);
   *    }).catch(function(error) {
   *      console.error(error);
   *    });
   */
  transact(queries, callback) {
    return multiple(this.pool, performTransaction, queries, callback);
  }
};
