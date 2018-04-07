/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/aspectSubjectMap/delete.js
 *
 * Deletes all the Aspect-Subject Map keys ("samsto:aspsubmap:*").
 *
 * Uses the ioredis streaming interface for the redis SCAN command
 * (https://github.com/luin/ioredis#streamify-scanning).
 */
'use strict';
const debug = require('debug')
  ('refocus-utilities:sampleStore:aspectSubjectMap:delete');
const samsto = require('../constants');
const helpers = require('../helpers');

module.exports = (redis) => new Promise((resolve, reject) => {
  debug('Scanning for "samsto:aspsubmap:*"');
  const stream = redis.scanStream({ match: 'samsto:aspsubmap:*' });
  let toDelete = [];
  stream.on('data', (found) => {
    debug('%d "samsto:aspsubmap:___" matches found %O', found.length, found);
    toDelete = toDelete.concat(found);
  });
  stream.on('end', () => {
    debug('Finished scanning. Found %d "samsto:aspsubmap:___" keys to delete %O',
      toDelete.length, toDelete);
    if (!toDelete.length) resolve();
    return redis.del(toDelete)
    .then((n) => debug('%d "samsto:aspsubmap:___" keys deleted', n))
    .then(resolve)
    .catch(reject);
  });
});
