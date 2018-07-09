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
 * Clean up sample store
 * - Check for all samples that are present in redis or not which are in master list
 * - Delete keys for samples which are not in the master list
 * - Validate each sample i.e aspectId, subjectId, name and if it failed to
 *   validate then remove that sample key as well as from master list of samples.
 *
 * Uses the ioredis streaming interface for the redis SCAN command
 * (https://github.com/luin/ioredis#streamify-scanning).
 */

'use strict';
const debug = require('debug')
  ('refocus-utilities:sample-store-cleanup');
const samsto = require('../constants');
const validateSample = require('../helpers').validateSample;
const ONE = 1;
const TWO = 2;
const ZERO = 0;
let samples = [];
let deletedSample = [];
let deletedSampleFromMasterList = [];

module.exports = (redis) => new Promise((resolve, reject) => {
  debug('Get Master samples list');
  redis.smembers(samsto.key.samples)
  .then((s) => {
    samples = s;
    debug('Check for all samples that are present in redis or not');
    const commands = s.map(sample => ['exists', sample]);

    redis.multi(commands).exec()
    .then((res) =>
      res.map((sample, currentIndex) => {
        if (!res[currentIndex][ONE])
          deletedSampleFromMasterList.push(commands[currentIndex][ONE]);
      })
    );
  })
  .then(() => {
    debug('Scanning for "samsto:sample:*"');
    const stream = redis.scanStream({ match: 'samsto:sample:*' });

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
          if (!validateSample(indRes[ONE])) {
            deletedSampleFromMasterList.push(commands[currentIndex][ONE]);
            deletedSample.push(commands[currentIndex][ONE]);
          }

          return acc;
        }, [])
      );
    });

    stream.on('end', () => {
      debug('End of scanning data');
      console.log('============== Samples which will be deleted =============');

      Array.from(new Set(deletedSample)).map((sample) => {
        console.log(sample);
      });
      console.log('=== Sample keys which will be deleted from master list ===');
      deletedSampleFromMasterList.map((sample) => {
        console.log(sample);
      });
      return resolve();
    });
  });
});
