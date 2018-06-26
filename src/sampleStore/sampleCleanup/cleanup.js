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
const ONE = 1;
const TWO = 2;
const ZERO = 0;
let samples = [];
let deletedSample = [];

/*
 * Validate sample
 *
 * @params {String} sample sample name
 * @throws an error if sample validation is failed
 */
function validateSample(sample) {
  if (!sample.name || sample.name.indexOf('|') < 0) {
    return false;
  }

  // check subject ID
  if (!sample.subjectId) {
    return false;
  }

  // check aspect ID
  if (!sample.aspectId) {
    return false;
  }

  return true;
}

module.exports = (redis) => new Promise((resolve, reject) => {
  debug('Get Master samples list');
  return redis.smembers(samsto.key.samples)
  .then((s) => {
    samples = s;
    debug('Check for all samples that are present in redis or not');
    let commands = s.map(sample => ['exists', sample]);

    redis.multi(commands).exec()
    .then((res) => {
      commands = s.reduce((acc, sample, currentIndex) => {
        if (!res[currentIndex][ONE]) acc.push(['srem', samsto.key.samples, sample]);
        return acc;
      }, []);

      redis.multi(commands).exec()
      .then((_res) => {
        commands.map((sampleDel, currentIndex) => {
          if (_res[currentIndex][ONE])
            debug('Removing %s sample from master list samsto:samples', sampleDel[TWO]);
        });
      });
    });
  })
  .then(() => {
    debug('Scanning for "samsto:sample:*"');
    const stream = redis.scanStream({ match: 'samsto:sample:*' });

    stream.on('data', (sampleStream) => {
      const commands = sampleStream.map((sample) => {
        if (samples.includes(sample)) return ['hgetall', sample];
        deletedSample.push(sample);
        return ['del', sample];
      });

      redis.multi(commands).exec()
      .then((res) =>
        res.reduce((acc, indRes, currentIndex) => {
          if (commands[currentIndex][ZERO] === 'hgetall') {
            if (!validateSample(indRes[ONE])) {
              acc.push(['del', sampleStream[currentIndex]]);
              acc.push(['srem', samsto.key.samples, sampleStream[currentIndex]]);
              deletedSample.push(sampleStream[currentIndex]);
            }
          }

          return acc;
        }, [])
      )
      .then((_commands) => redis.multi(_commands).exec());
    });

    stream.on('end', () => {
      debug('End of scanning data');
      debug('Removed samples list: %o', deletedSample);
      return resolve();
    });
  });
});
