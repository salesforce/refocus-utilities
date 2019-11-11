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
  console.log('-- addRangesCmds', aspName);
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
  // running with logging.
  // 500 - .1 is correct
  // so it can at least do math normally
  // woah. Looks like adjustDown isn't even called for heimdall
  // aha! looks like ranges are being passed in the wrong order
  // preprocessOverlaps assumes ascending order
  // getAspectRanges is supposed to sort them - what's happening?
  // they are correctly sorted locally but not in heroku
  // the order that the ranges are passed to the sort fn is different!
  // locally, it goes in order - critical first, so true
  // on heroku, warning first, so false
  // ah!
  // my sort function was return the boolean result of >
  // it's supposed to be -1/0/1
  // it works in most cases because the true/false gets converted to 0/1,
  // and the zero doesn't change the order, so as long as the next one does change it
  // it still works out to be the same
  // so if the sort function gets called in the right order it will sort correctly
  // and this seems to happen most of the time, at least for simple/small arrays
  // but this isn't guaranteed; the sort fn is incorrect, and there will be cases where it
  // returns an incorrect result, depending on the implementation
  // in this case it seems like the elements are getting called in different orders in
  // different environments, which is why the error is only triggered in heroku
  // ok, pretty confident this is it.
  // so I just need to fix that to return an int.

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
