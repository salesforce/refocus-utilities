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
    return redis.multi(commands).exec()
    .then((res) =>
      res.map((sample, currentIndex) => {
        if (!res[currentIndex][ONE]) {
          deletedSampleFromMasterList.push(commands[currentIndex][ONE]);
          debug('Should be removed: %s sample from master list samsto:samples. ' +
            'Reason: No hash.', commands[currentIndex][ONE]);
        }
      })
    );
  })
  .then(() => {
    debug(`Scanning for "${samsto.pfx.sample}*" keys...`);
    debug(`Checking aspect and subject hash for each sample...`);
    const stream = redis.scanStream({ match: `${samsto.pfx.sample}*` });

    stream.on('data', (sampleStream) => {
      const subjaspCommands = [];
      const validSampleKeyNames = [];
      sampleStream.map((sampleKey) => {
        const sampName = helpers.getNameFromKey(sampleKey);
        const aspSubjName = sampName.split('|');

        const subjName = aspSubjName[0];
        const aspName = aspSubjName[1];

        if (aspSubjName.length === 2) {
          subjaspCommands.push(['exists', `samsto:subject:${subjName}`]);
          subjaspCommands.push(['exists', `samsto:aspect:${aspName}`]);
          validSampleKeyNames.push(sampleKey);
        } else {
          deletedSampleFromMasterList.push(sampleKey);
          deletedSample.push(sampleKey);
          debug('Should be removed: %s sample hash and entry from master list. ' +
            'Reason: Invalid sample key', sampleKey);
        }
      });

      /**
       * If subject or aspect names from sample does not exist in sample store,
       * then add the sample to the delete list.
       */
      const getHashCommands = [];
      const sampleKeysWithSubjAsp = [];
      const sampleKeysToGet = [];
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

          validSampleKeyNames.map((sampleKey, sampleIdx) => {
            const subjIdx = 2 * sampleIdx;
            const aspIdx = (2 * sampleIdx) + 1;
            if (!res[subjIdx][ONE] || !res[aspIdx][ONE]) {
              deletedSampleFromMasterList.push(sampleKey);
              deletedSample.push(sampleKey);
              debug('Should be removed: %s sample hash and entry from master list. ' +
                'Reason: Subject or Aspect not present.', sampleKey);
            } else {
              sampleKeysWithSubjAsp.push(sampleKey);
            }
          });

          // get sample only if the key exists in master list of samples,
          // else add to delete list
          sampleKeysWithSubjAsp.map((key, currIdx) => {
            if (samples.includes(key)) {
              getHashCommands.push(['hgetall', key]);
              // sampleKeysToGet.push(key);
            } else {
              deletedSample.push(key);
              debug('Should be removed: %s sample hash. Reason: Sample not present ' +
                'in master list.', key);
            }
          });

          return redis.multi(getHashCommands).exec();
        })
        .then((res) =>
          res.reduce((acc, indRes, currentIndex) => {
            const key = getHashCommands[currentIndex][ONE];
            if (!helpers.validateSample(indRes[ONE]) ||
              !helpers.sampleKeyNameMatch(key, indRes[ONE].name)) {
              deletedSampleFromMasterList.push(key);
              deletedSample.push(key);
              debug('Should be removed: %s sample hash and entry from master list. ' +
                'Reason: Invalid sample.', key);
            }

            return acc;
          }, [])
        );
    });

    stream.on('end', () => {
      debug(`Completed scan for "${samsto.pfx.sample}*" keys`);
      console.log('============== Samples which would be deleted =============');
      console.log([...new Set(deletedSample)]);
      console.log('=== Sample keys which would be deleted from master list ===');
      console.log([...new Set(deletedSampleFromMasterList)]);
      return resolve();
    });
  });
});
