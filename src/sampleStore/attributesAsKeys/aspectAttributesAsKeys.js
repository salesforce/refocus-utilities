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
 * @param  {String} aspName - aspect name
 * @param  {Object} aspect - aspect object from Redis
 * @param  {Array} batch - active redis batch
 */
function addRangesCmds(aspName, aspect, batch, clear) {
  const key = `${samsto.pfx.aspectRanges}${aspName}`;
  batch.del(key);
  if (clear) return;

  let ranges = statusCalculation.getAspectRanges(aspect);
  console.log('-- preprocessing', ranges);

  // somehow this isn't adjusting to decimals
  // I think the only way this could happen is if adjustDown fails.
  // and the only way that could happen is if 500 - .1 = 500
  // which is ridiculous, that should never happen.
  // possibly a different environment with an old or incorrect math module?
  // possibly it's somehow configured to only allow integer math?
  // is it possible the volume of operations somehow overwhelms it?
  ranges = statusCalculation.preprocessOverlaps(ranges);
  console.log('-- setting', ranges);
  statusCalculation.setRanges(batch, ranges, key);
} // addRangesCmds

function addTagsCmds(aspName, aspect, batch, clear) {
  const key = `${samsto.pfx.aspectTags}${aspName}`;
  batch.del(key);
  if (clear) return;

  if (aspect.tags && typeof aspect.tags === 'string') {
    const tags = JSON.parse(aspect.tags);
    if (!Array.isArray(tags)) {
      throw new Error(`Invalid tags values: ${tags}`);
    }

    if (tags.length) {
      batch.sadd(key, tags);
    }
  }
}

function addWritersCmds(aspName, aspect, batch, clear) {
  const key = `${samsto.pfx.aspectWriters}${aspName}`;
  batch.del(key);
  if (clear) return;

  if (aspect.writers && typeof aspect.writers === 'string') {
    const writers = JSON.parse(aspect.writers);
    if (!Array.isArray(writers)) {
      throw new Error(`Invalid writers values: ${writers}`);
    }

    if (writers.length) {
      batch.sadd(key, writers);
    }
  }
}

function addExistsCmds(aspName, aspect, batch, clear) {
  const key = `${samsto.pfx.aspectExists}${aspName}`;
  batch.del(key);
  if (clear) return;

  batch.set(key, 'true');
}

module.exports = (redis, clear=false, preview=true) => redis.smembers(samsto.key.aspects)
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
        const aspName = asp.name.toLowerCase();
        if (asp.isPublished === 'true') {
          if (aspName) {
            // add tags, writers and ranges commands
            addTagsCmds(aspName, asp, batch, clear);
            addWritersCmds(aspName, asp, batch, clear);
            addRangesCmds(aspName, asp, batch, clear);
            addExistsCmds(aspName, asp, batch, clear);
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
