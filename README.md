# pga

[![npm](https://img.shields.io/npm/v/pga.svg?style=flat-square)](https://www.npmjs.com/package/pga) [![Build Status](https://img.shields.io/travis/ConnorWiseman/pga/master.svg?style=flat-square)](https://travis-ci.org/ConnorWiseman/pga) [![Coverage](https://img.shields.io/codecov/c/github/ConnorWiseman/pga.svg?style=flat-square)](https://codecov.io/gh/ConnorWiseman/pga)
[![Dependencies Status](https://david-dm.org/ConnorWiseman/pga/status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga)
[![devDependencies Status](https://david-dm.org/ConnorWiseman/pga/dev-status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/pga?type=dev)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ConnorWiseman/pga/blob/master/LICENSE)

A convenience wrapper around the [pg-pool](https://github.com/brianc/node-pg-pool) module. Supports callbacks and Promises.


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

### Regular Queries

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

### Transactions

```javascript
// A transaction with a callback function.
db.transact([
  { query: 'SELECT COUNT(*) FROM test;' },
  { query: 'SELECT * FROM test WHERE id = $1::int;', params: [ 1 ] },
  { query: 'INSERT INTO test (name) VALUES ($1:text);', params: [ 'Name!' ] },
  { query: 'SELECT COUNT(*) FROM test;' }
], function(error, results) {
  if (error) {
    return console.error(error);
  }
  console.log(results);
});

// A transaction with a Promise object.
db.transact([
  { query: 'SELECT COUNT(*) FROM test;' },
  { query: 'SELECT * FROM test WHERE id = $1::int;', params: [ 1 ] },
  { query: 'INSERT INTO test (name) VALUES ($1:text);', params: [ 'Name!' ] },
  { query: 'SELECT COUNT(*) FROM test;' }
]).then(function(results) {
  console.log(results);
}).catch(function(error) {
  console.error(error);
});
```
