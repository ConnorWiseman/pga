# pga

[![npm](https://img.shields.io/npm/v/pga.svg?style=flat-square)](https://www.npmjs.com/package/pga)
![Node.js](https://img.shields.io/badge/node.js-%3E=_6.4.0-blue.svg?style=flat-square)
[![Build Status](https://img.shields.io/travis/ConnorWiseman/pga/master.svg?style=flat-square)](https://travis-ci.org/ConnorWiseman/pga) [![Coverage](https://img.shields.io/codecov/c/github/ConnorWiseman/pga.svg?style=flat-square)](https://codecov.io/gh/ConnorWiseman/pga)
[![Dependencies Status](https://david-dm.org/ConnorWiseman/pga/status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga)
[![devDependencies Status](https://david-dm.org/ConnorWiseman/pga/dev-status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga?type=dev)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ConnorWiseman/pga/blob/master/LICENSE)

A convenience wrapper around the [pg](https://github.com/brianc/node-postgres) module's [Pool object](https://github.com/brianc/node-pg-pool).


## Installation

```shell
npm install --save pga
```


## Usage

```javascript
const pga = require('pga');
const sql = pga.sql;

var db = pga({
  user:     'postgres',
  password: '',
  database: 'postgres',
  host:     'localhost',
  port:     5432,
  max:      10
});
```


## API
### &#35;close
Closes the database connection. An alias for `Pool.end`.

```javascript
db.close();
```


### &#35;parallel
Performs a series of parameterized queries in parallel over multiple connections from the underlying pool.

Query execution order is arbitrary, but the results are returned in the expected order.

If a single query results in an error, `parallel` will immediately execute the specified callback function with both the error and potentially a partial array of results from other successful queries. When returning a Promise, one error among any of the queries will result in the Promise being rejected.

`parallel` is provided as a means of efficiently performing multiple `SELECT` queries at once rather than one after the other in sequence. Do _not_ use `parallel` to execute grouped SQL queries that may potentially alter the database- use [`transact`](https://github.com/ConnorWiseman/pga#transact) instead!

```javascript
// Parallelized queries with a callback function.
db.parallel([
  { text: 'SELECT COUNT(*) FROM test;' },
  { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
  { text: 'SELECT * FROM test;' }
], function(error, results) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});

// Parallelized queries that return a Promise object.
db.parallel([
  { text: 'SELECT COUNT(*) FROM test;' },
  { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
  { text: 'SELECT * FROM test;' }
]).then(function(results) {
  console.log(results);
}).catch(function(error) {
  console.error(error);
});
```


### &#35;query
Performs a single parameterized query. An alias for `Pool.query`.

```javascript
// A regular query with a callback function.
db.query('SELECT * FROM test;', function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(result.rows);
});

// A regular query with a parameter and callback function.
db.query('SELECT * FROM test WHERE id = $1::int;', [ 1 ], function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(result.rows);
});

// A regular query that returns a Promise object.
db.query('SELECT * FROM test;').then(function(result) {
  console.log(result.rows);
}).catch(function(error) {
  console.error(error);
});

// A regular query with a parameter that returns a Promise object.
db.query('SELECT * FROM test WHERE id = $1::int;', [ 1 ]).then(function(result) {
  console.log(result.rows);
}).catch(function(error) {
  console.error(error);
});
```


### &#35;transact
Performs a database transaction on an array of parameterized queries.

```javascript
// A transaction with a callback function.
db.transact([
  { text: 'SELECT COUNT(*) FROM test;' },
  { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
  { text: 'INSERT INTO test (name) VALUES ($1:text);', values: [ 'Name!' ] },
  { text: 'SELECT COUNT(*) FROM test;' }
], function(error, results) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});

// A transaction that returns a Promise object.
db.transact([
  { text: 'SELECT COUNT(*) FROM test;' },
  { text: 'SELECT * FROM test WHERE id = $1::int;', values: [ 1 ] },
  { text: 'INSERT INTO test (name) VALUES ($1:text);', values: [ 'Name!' ] },
  { text: 'SELECT COUNT(*) FROM test;' }
]).then(function(results) {
  console.log(results);
}).catch(function(error) {
  console.error(error);
});
```



## &#35;sql
A template tagging function that returns an object compatible with `node-postgres`'s querying methods and, by extension, `pga`'s  `query`, `parallel`, and `transact` methods. Template literal variable interpolation makes writing lengthy parameterized queries much cleaner.

Regular variables may be interpolated as string literals (without applying parameterized filtering from the `node-postgres` module) by prefixing them with an additional `$` character. This is unsafe, and should be used carefully.

### Query
```javascript
var id = 1;
var table = 'test';
var query = sql`SELECT * FROM $${table} WHERE id = ${id};`;

db.query(query, function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(result);
});
```


### Parallel
```javascript
var id = 1;
var query = sql`SELECT * FROM test WHERE id = ${id};`;

db.parallel([
  query,
  query,
  query,
  query
], function(error, results) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});
```


### Transaction
```javascript
var text = 'Hello, world!';
var query = sql`INSERT INTO test(words) VALUES (${text});`;

db.transact([
  query,
  query,
  query,
  query
], function(error, results) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});
```
