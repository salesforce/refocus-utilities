/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/sampleCleanup/previewCleanup.js
 *
 * Preview mode - does not delete anything!
 * - List all the samples in the "samsto:samples" set which don't have a
 *   corresponding "samsto:sample:[SAMPLE_NAME]" hash.
 * - List all the invalid samples, i.e. any "samsto:sample:[SAMPLE_NAME]" hash
 *   which is missing an aspectId or subjectId, or whose name doesn't look like
 *   a sample name.
 *
 * Uses the ioredis streaming interface for the redis SCAN command
 * (https://github.com/luin/ioredis#streamify-scanning).
 */
'use strict';
const debug = require('debug')('refocus-utilities:sample-store-cleanup');
const samsto = require('../constants');
const helpers = require('../helpers');
const ONE = 1;
const TWO = 2;
const ZERO = 0;
let samples = [];
let deletedSample = [];
let deletedSampleFromMasterList = [];

module.exports = (redis) => new Promise((resolve, reject) => {
  debug(`Getting members of "${samsto.key.samples}" set...`);
  redis.smembers(samsto.key.samples)
  .then((members) => {
    samples = members;
    debug('Checking whether each member of the set has a corresponding ' +
      `"${samsto.pfx.sample}[SAMPLE_NAME]" hash`);
    const commands = members.map(sample => ['exists', sample]);

    // TODO unnest nested promise
    redis.multi(commands).exec()
    .then((res) =>
      res.map((sample, currentIndex) => {
        if (!res[currentIndex][ONE])
          deletedSampleFromMasterList.push(commands[currentIndex][ONE]);
      })
    );
  })
  .then(() => {
    debug(`Scanning for "${samsto.pfx.sample}*" keys...`);
    const stream = redis.scanStream({ match: `${samsto.pfx.sample}*` });

    stream.on('data', (sampleStream) => {
      const commands = sampleStream.reduce((acc, indRes, currentIndex) => {
        if (samples.includes(sampleStream[currentIndex]))
          acc.push(['hgetall', sampleStream[currentIndex]]);
        else
          deletedSample.push(sampleStream[currentIndex]);
        return acc;
      }, []);

      redis.multi(commands).exec()
      .then((res) =>
        res.reduce((acc, indRes, currentIndex) => {
          const key = sampleStream[currentIndex];
          if (!helpers.validateSample(indRes[ONE]) ||
            !helpers.sampleKeyNameMatch(key, indRes[ONE].name)) {
            deletedSampleFromMasterList.push(commands[currentIndex][ONE]);
            deletedSample.push(commands[currentIndex][ONE]);
          }

          return acc;
        }, [])
      );
    });

    stream.on('end', () => {
      debug(`Completed scan for "${samsto.pfx.sample}*" keys`);
      console.log('============== Samples which would be deleted =============');
      Array.from(new Set(deletedSample)).map(console.log);
      console.log('=== Sample keys which would be deleted from master list ===');
      deletedSampleFromMasterList.map(console.log);
      return resolve();
    });
  });
});
