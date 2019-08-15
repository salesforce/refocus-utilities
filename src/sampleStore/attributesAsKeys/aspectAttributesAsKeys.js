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

function getRangesKeys(status, range) {
  const [min, max] = range;

  const precedence = {};
  if (min === max) { // make sure min is first for flat ranges
    precedence.min = 1;
    precedence.max = 2;
  } else { // ties go to the lower range
    precedence.max = 0;
    precedence.min = 3;
  }

  const minKey = getRangeKey({ type: 'min', status, precedence });
  const maxKey = getRangeKey({ type: 'max', status, precedence });
  return [minKey, maxKey];

  function getRangeKey({ type, precedence, status }) {
    return `${precedence[type]}:${type}:${status}`;
  }
}

/**
 * Set ranges keys for this aspect.
 *
 * @param  {Object} aspect - aspect object from Redis
 * @param  {Boolean} preview - preview mode
 * @param  {Array} redisCmds - redis commands array
 */
function addRangesCmds(aspect, preview, redisCmds) {
  const key = `${samsto.pfx.aspectRanges}${aspect.name.toLowerCase()}`;
  const ranges = {
    Critical: aspect.criticalRange,
    Warning: aspect.warningRange,
    Info: aspect.infoRange,
    OK: aspect.okRange,
  };

  Object.entries(ranges)
    .filter(([status, range]) => range)
    .reduce((redisCmds, [status, minMax]) => {
      const minMaxVal = JSON.parse(minMax);
      const minMaxKey = getRangesKeys(
        status, [minMaxVal[0], minMaxVal[1]]);
      const minCmd = ['zadd', key, minMaxVal[0], minMaxKey[0]];
      const maxCmd = ['zadd', key, minMaxVal[1], minMaxKey[1]];

      redisCmds.push(minCmd);
      redisCmds.push(maxCmd);

      return redisCmds;
    }, redisCmds);
} // addRangesCmds

function addTagsCmds(aspName, aspect, preview, aspAttrCmds) {
  if (aspect.tags && !Array.isArray(aspect.tags) && typeof aspect.tags !== 'object') {
    const tags = JSON.parse(aspect.tags);
    if (!Array.isArray(tags)) {
      throw new Error(`Invalid tags values: ${tags}`);
    }

    if (tags.length) {
      const cmd = ['sadd', `${samsto.pfx.aspectTags}${aspName}`, ...tags];
      aspAttrCmds.push(cmd);
    }
  }
}

function addWritersCmds(aspName, aspect, preview, aspAttrCmds) {
  if (aspect.writers && !Array.isArray(aspect.writers) && typeof aspect.writers !== 'object') {
    const writers = JSON.parse(aspect.writers);
    if (!Array.isArray(writers)) {
      throw new Error(`Invalid writers values: ${writers}`);
    }

    if (writers.length) {
      const cmd = ['sadd', `${samsto.pfx.aspectWriters}${aspName}`, ...writers];
      aspAttrCmds.push(cmd);
    }
  }
}

module.exports = (redis, preview=true) => redis.smembers(samsto.key.aspects)
    .then((aspectKeys) => {
      debug('%d samsto:aspect:___ keys found %o', aspectKeys.length,
        aspectKeys);
      const getAspectCmds = aspectKeys.map((aspKey) => ['hgetall', aspKey]);
      return redis.multi(getAspectCmds).exec();
    })
    .then((getAspResults) => {
      const aspAttrCmds = [];
      getAspResults.forEach((aspRes) => {
        const asp = aspRes[1];
        const aspName = asp.name;
        if (asp.isPublished === 'true') {
          if (aspName) {
            // add tags, writers and ranges commands
            addTagsCmds(aspName, asp, preview, aspAttrCmds);
            addWritersCmds(aspName, asp, preview, aspAttrCmds);
            addRangesCmds(asp, preview, aspAttrCmds);
          }
        }
      });

      if (preview) {
        debug('[Preview mode] %d commands to be executed: %o',
          aspAttrCmds.length, aspAttrCmds);
        return Promise.resolve();
      }

      debug('%d commands executing: %o', aspAttrCmds.length, aspAttrCmds);
      return redis.multi(aspAttrCmds).exec();
    })
    .then(() => debug('Success!'))
    .catch((err) => console.error(err));
