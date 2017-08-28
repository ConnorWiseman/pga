/**
 * @file
 */
'use strict';


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
module.exports = function sql(strings, ...keys) {
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
};
