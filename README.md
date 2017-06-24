# pga

[![npm](https://img.shields.io/npm/v/pga.svg?style=flat-square)](https://www.npmjs.com/package/pga) [![Build Status](https://img.shields.io/travis/ConnorWiseman/pga/master.svg?style=flat-square)](https://travis-ci.org/ConnorWiseman/pga) [![Coverage](https://img.shields.io/codecov/c/github/ConnorWiseman/pga.svg?style=flat-square)](https://codecov.io/gh/ConnorWiseman/pga)
[![Dependencies Status](https://david-dm.org/ConnorWiseman/pga/status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga)
[![devDependencies Status](https://david-dm.org/ConnorWiseman/pga/dev-status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga?type=dev)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ConnorWiseman/pga/blob/master/LICENSE)

A convenience wrapper around the [pg](https://github.com/brianc/node-postgres) module's [Pool object](https://github.com/brianc/node-pg-pool). Supports callbacks and Promises.


## Installation

```shell
npm install --save pga
```


## Usage

```javascript
const pga = require('pga');

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
let db = pga(config);

db.close();
```


### &#35;query
Performs a single parameterized query.

```javascript
// A regular query with a callback function.
db.query('SELECT * FROM test;', function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(result.rows);
});

// A regular query with a Promise object.
db.query('SELECT * FROM test;').then(function(result) {
  console.log(result.rows);
}).catch(function(error) {
  console.error(error);
});
```


### &#35;sql
A template tagging function that returns an object compatible with `node-postgres`'s querying methods and, by extension, `pga`'s  `query` and `transact` methods. Template literal variable interpolation makes writing lengthy parameterized queries much cleaner.

#### Query
```javascript
let db = pga(config);

let id = 1;
let query = db.sql`SELECT * FROM test WHERE id = ${id};`;

db.query(query, function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});
```

#### Transaction
```javascript
let db = pga(config);

let text = 'Hello, world!';
let query = db.sql`INSERT INTO test(words) VALUES (${text});`;

db.transact([
  query,
  query,
  query,
  query
], function(error, result) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
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

// A transaction with a Promise object.
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
