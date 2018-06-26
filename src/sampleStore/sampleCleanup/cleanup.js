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
const helpers = require('../helpers');
let samples = [];
let deletedSample = [];

/*
 * Validate sample
 *
 * @params {String} sample sample name
 * @throws an error if sample validation is failed
 */
function validateSample(redis, sample) {
  return redis.hgetall(sample)
  .then((s) => {
    // check name
    if (!s.name || s.name.indexOf('|') < 0) {
      throw new Error('Sample name is not valid');
    }

    // check subject ID
    if (!s.subjectId) {
      throw new Error('Sample does not have subjectId');
    }

    // check aspect ID
    if (!s.aspectId) {
      throw new Error('Sample does not have subjectId');
    }
  });
}

module.exports = (redis) => new Promise((resolve, reject) => {
  debug('Get Master samples list');
  return redis.smembers(samsto.key.samples)
  .then((s) => {
    samples = s;
    debug('Check for all samples that are present in redis or not');
    for (let x = 0; x < samples.length; x++) {
      redis.exists(samples[x])
      .then((s) => {
        if (!s) {
          redis.srem(samsto.key.samples, samples[x])
          .then(() => {
            debug('Removing %s sample from master list samsto:samples', samples[x]);
          });
        }
      });
    }
  })
  .then(() => {
    debug('Scanning for "samsto:sample:*"');
    const stream = redis.scanStream({ match: 'samsto:sample:*' });

    stream.on('data', (found) => {
      found.forEach((sample) => {
        // check whether sample is in master list or not
        if (!samples.includes(sample)) {
          debug('Deleting Sample %s', sample);
          redis.del(sample)
          .then(() => {
            // gather deleted sample in one list
            deletedSample.push(sample);
          });
        } else {
          // if sample is in master list then check for validation
          validateSample(redis, sample)
          .catch((err) => {
            debug('Validation error with %s sample, %o', sample, err);
            debug('Deleting Sample %s', sample);
            redis.del(sample)
            .then(() => {
              // gather deleted sample in one list
              deletedSample.push(sample);

              // remove sample from master list of samples
              debug('Removing %s sample from master list samsto:samples', sample);
              redis.srem(samsto.key.samples, sample);
            });
          });
        }
      });
    });

    stream.on('end', () => {
      debug('End of scanning data');
      debug('Removed samples list: %o', deletedSample);
      return resolve();
    });
  });
});
