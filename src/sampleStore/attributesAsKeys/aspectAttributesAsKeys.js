/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/attributesAsKeys/aspectAttributesAsKeys.js
 *
 * Populate the Sample Store with Aspect tags, writers and ranges as individual keys.
 * eg. samsto:aspTags:{aspectName} -> set of tags
 * samsto:aspWriters:{aspectName} -> set of usernames
 * samsto:aspRanges:{aspectName} -> sorted set of aspect ranges
 */
'use strict';
const debug = require('debug')
('refocus-utilities:sampleStore:aspectAttributesAsKeys');
const samsto = require('../constants');
const statusCalculation = require('./statusCalculation');

/**
 * Set ranges keys for this aspect.
 *
 * @param  {Object} aspect - aspect object from Redis
 * @param  {Array} batch - active redis batch
 */
function addRangesCmds(aspect, batch) {
  let ranges = statusCalculation.getAspectRanges(aspect);
  ranges = statusCalculation.preprocessOverlaps(ranges);
  statusCalculation.setRanges(batch, ranges, aspect.name);
} // addRangesCmds

function addTagsCmds(aspName, aspect, batch) {
  if (aspect.tags && typeof aspect.tags === 'string') {
    const tags = JSON.parse(aspect.tags);
    if (!Array.isArray(tags)) {
      throw new Error(`Invalid tags values: ${tags}`);
    }

    if (tags.length) {
      batch.sadd(`${samsto.pfx.aspectTags}${aspName}`, tags);
    }
  }
}

function addWritersCmds(aspName, aspect, batch) {
  if (aspect.writers && typeof aspect.writers === 'string') {
    const writers = JSON.parse(aspect.writers);
    if (!Array.isArray(writers)) {
      throw new Error(`Invalid writers values: ${writers}`);
    }

    if (writers.length) {
      batch.sadd(`${samsto.pfx.aspectWriters}${aspName}`, writers);
    }
  }
}

module.exports = (redis, preview=true) => redis.smembers(samsto.key.aspects)
    .then((aspectKeys) => {
      debug('%d samsto:aspect:___ keys found', aspectKeys.length);
      aspectKeys.forEach((key) =>
        debug(key)
      );
      const batch = redis.multi();
      aspectKeys.map((aspKey) => batch.hgetall(aspKey));
      return batch.exec();
    })
    .then((getAspResults) => {
      const batch = redis.multi();
      getAspResults.forEach((aspRes) => {
        const asp = aspRes[1];
        const aspName = asp.name;
        if (asp.isPublished === 'true') {
          if (aspName) {
            // add tags, writers and ranges commands
            addTagsCmds(aspName, asp, batch);
            addWritersCmds(aspName, asp, batch);
            addRangesCmds(asp, batch);
          }
        }
      });

      const cmds = batch._queue
        .filter(cmd => cmd.name !== 'multi')
        .map(cmd => `${cmd.name}(${cmd.args.join(', ')})`);

      if (preview) {
        debug('[Preview mode] %d commands to be executed:', cmds.length);
        cmds.forEach((cmd) =>
          debug('[Preview mode] %O', cmd)
        );
        return Promise.resolve();
      }

      debug('%d commands executing:', cmds.length);
      cmds.forEach((cmd) =>
        debug(cmd)
      );
      return batch.exec();
    })
    .then(() => debug('Success!'))
    .catch((err) => console.error(err));