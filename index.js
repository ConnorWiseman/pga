/**
 * @file Exports a function that creates a PostgreSQLAdapter object instance.
 */
'use strict';

// Required project modules.
const PostgreSQLAdapter = require('./src/pga.js');


/**
 * Exports a function that returns a new PostgreSQLAdapter object instance.
 * @param  {Object} config
 * @return {PostgreSQLAdapter}
 */
module.exports = function(config) {
  return new PostgreSQLAdapter(config);
};
