/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/sampleCleanup/cleanup.js
 *
 * Clean up sample store
 * - Check for all samples that are present in redis or not which are in master list
 * - Delete keys for samples which are not in the master list
 * - Validate each sample i.e aspectId, subjectId, name and if it failed to
 *   validate then remove that sample key as well as from master list of samples.
 * - Validate that each sample's name attribute matches its redis key. On
 *   mismatch, remove that sample key as well as from master list of samples.
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
  debug('Get Master samples list');
  let existsCommands;
  return redis.smembers(samsto.key.samples)
    .then((s) => {
      samples = s;
      debug('Checking whether each member of the set has a corresponding ' +
        `"${samsto.pfx.sample}[SAMPLE_NAME]" hash`);
      existsCommands = s.map(sample => ['exists', sample]);
      return redis.multi(existsCommands).exec();
    })
    .then((res) => {
      res.map((resEntry, currIdx) => {
        if (!res[currIdx][ONE]) { // if does not exists
          const sampleKey = existsCommands[currIdx][ONE];
          deletedSampleFromMasterList.push(sampleKey);
          debug('Removing %s sample from master list samsto:samples. ' +
            'Reason: No hash.', sampleKey);
        }
      });

      debug(`Scanning for "${samsto.pfx.sample}*" keys...`);
      const stream = redis.scanStream({ match: `${samsto.pfx.sample}*` });

      stream.on('data', (sampleStream) => {
        const subjaspCommands = [];
        const validSampleKeys = [];
        /**
         * If subject or aspect names from sample does not exist in sample store,
         * then add the sample to the delete list.
         */
        sampleStream.map((sampleKey) => {
          const sampName = helpers.getNameFromKey(sampleKey);
          const aspSubjName = sampName.split('|');
          const subjName = aspSubjName[0];
          const aspName = aspSubjName[1];

          if (aspSubjName.length === 2) {
            subjaspCommands.push(['exists', `samsto:subject:${subjName}`]);
            subjaspCommands.push(['exists', `samsto:aspect:${aspName}`]);
            validSampleKeys.push(sampleKey);
          } else { // invalid sample key
            deletedSampleFromMasterList.push(sampleKey);
            deletedSample.push(sampleKey);
            debug('Removing %s sample hash and entry from master list. ' +
              'Reason: Invalid sample key', sampleKey);
          }
        });

        const getHashCommands = [];
        const filteredSampleKeys = [];
        return redis.multi(subjaspCommands).exec()
          .then((res) => {
            /**
             * ith sample in sampleStream corresponds to:
             * 2*i index for subject in subjaspCommands
             * (2*i) + 1 index for aspect in subjaspCommands
             *
             * Sample key is valid only if we get positive result for subject
             * and aspect key existence in sample store
             */

            validSampleKeys.map((sampleKey, sampleIdx) => {
              const subjIdx = 2 * sampleIdx;
              const aspIdx = (2 * sampleIdx) + 1;
              if (!res[subjIdx][ONE] || !res[aspIdx][ONE]) { // asp/subj hash not present
                deletedSampleFromMasterList.push(sampleKey);
                deletedSample.push(sampleKey);
                debug('Removing %s sample hash and entry from master list. ' +
                  'Reason: Subject or Aspect not present.', sampleKey);
              } else {
                if (samples.includes(sampleKey)) {
                  getHashCommands.push(['hgetall', sampleKey]);
                  filteredSampleKeys.push(sampleKey);
                } else {
                  deletedSample.push(sampleKey);
                  debug('Removing %s sample hash. Reason: Sample not present ' +
                    'in master list.', sampleKey);
                }
              }
            });

            return redis.multi(getHashCommands).exec()
          })
          .then((res) => {
            res.map((resEntry, currIdx) => {
              const sampleKey = filteredSampleKeys[currIdx];

              if (!helpers.validateSample(resEntry[ONE]) ||
                !helpers.sampleKeyNameMatch(sampleKey, resEntry[ONE].name)) {
                deletedSampleFromMasterList.push(filteredSampleKeys[currIdx]);
                deletedSample.push(filteredSampleKeys[currIdx]);

                debug('Removing %s sample hash and entry from master list. ' +
                  'Reason: Invalid sample.', filteredSampleKeys[currIdx]);
              }
            });

            // delete samples from master list and corresponding hashes
            const deleteCommands = [];
            deletedSampleFromMasterList.forEach((sampleKey) => {
              deleteCommands.push(['srem', samsto.key.samples, sampleKey]);
            });

            deletedSample.forEach((sampleKey) => {
              deleteCommands.push(['del', sampleKey]);
            });

            return redis.multi(deleteCommands).exec()
          })
      });

      stream.on('end', () => {
        debug(`Completed scan for "${samsto.pfx.sample}*" keys`);
        console.log('===================== Deleted Samples ====================');
        console.log([...new Set(deletedSample)]);

        console.log('=== Sample keys which would be deleted from master list ===');
        console.log([...new Set(deletedSampleFromMasterList)]);

        return resolve();
      });
    })
    .catch((err) => {
      debug(`Got error: %o`, err);
      console.log('Got error', err);
    })
});
