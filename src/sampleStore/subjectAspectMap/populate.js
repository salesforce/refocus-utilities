/**
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/subjectAspectMap/populate.js
 *
 * Populate the Sample Store's Subject-Aspect Map based on the members of the
 * "samsto:samples" set and their references to the Subject-Aspect Map.
*/

const debug = require('debug');
const log = debug('refocus-utilities:sampleStore:subjectAspectMap:populate');
const samsto = require('../constants');

/**
 * @param {object} redis - ioredis connection object
 * @param {string} subjectKey - prefix of samples to find
 * @returns {object} readable stream of sample arrays
 */
function createRedisSampleStream(redis, subjectKey) {
  const sampleMatch = `samsto:sample:${subjectKey}*`;
  log(`Scanning samples for matches to: ${sampleMatch}`);
  return redis.scanStream({ match: sampleMatch, count: 100 });
}

/**
 * @param {string} sampleKey - sample key from redis in the form samsto:sample:<subject>|<aspect>
 * @returns {object} object containing aspect and subject
 */
function getSubjectAndAspectFromSampleKey(sampleKey) {
  const sampleName = sampleKey.split(':')[2];
  const [subject, aspect] = sampleName.split('|');
  return { subject, aspect };
}

/**
 * @param {object} redis - ioRedis object
 * @param {string[]} listOfSamples - array of sample strings from redis
 * @returns {Promise}
 */
function addEntriesToAspectSubjectMap(redis, listOfSamples) {
  return new Promise((resolve) => {
    const pipeline = redis.pipeline();
    listOfSamples.forEach((sampleKey) => {
      log(`Adding subaspmap for ${sampleKey}`);
      const { aspect, subject } = getSubjectAndAspectFromSampleKey(sampleKey);
      pipeline.sadd(`${samsto.pfx.sam}${subject}`, aspect);
    });
    pipeline.exec().then((responseCodeList) => {
      responseCodeList.forEach(([err, code]) => {
        if (err || code !== 1) {
          log(`Error adding to subject aspect map: ${code}`);
        }
      });
      log(`Response from adding aspect(s) to subject aspect map: 
        ${JSON.stringify(responseCodeList)}`);
      resolve();
    });
  });
}

/**
 * @param {object} redis - ioredis connection object
 * @param {string} subjectKey - prefix of samples to find
 * @returns {Promise} - promise which resolves after all additions are made
 */
function populateSubjectAspectMap(redis, subjectKey = '') {
  return new Promise((resolve, reject) => {
    const stream = createRedisSampleStream(redis, subjectKey);
    const addingJobs = [];
    let numberOfSubAspMapEntriesAdded = 0;
    stream.on('data', (listOfSamples) => {
      addingJobs.push(addEntriesToAspectSubjectMap(redis, listOfSamples)
        .then(() => {
          numberOfSubAspMapEntriesAdded += listOfSamples.length;
          log(`Added ${listOfSamples.length} aspects to subjectAspectMap`);
        }));
    });

    stream.on('end', () => {
      Promise.all(addingJobs)
        .then(() => resolve(numberOfSubAspMapEntriesAdded))
        .catch(reject);
    });
  });
}

module.exports = populateSubjectAspectMap;
