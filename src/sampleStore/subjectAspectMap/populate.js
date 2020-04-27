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
 * @returns {object} readable stream of sample arrays
 */
function createRedisSampleStream(redis) {
  return redis.scanStream({ match: 'samsto:sample:*', count: 100 });
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
 * @returns {Promise} - promise which resolves after all additions are made
 */
function populateSubjectAspectMap(redis) {
  return new Promise((resolve, reject) => {
    const stream = createRedisSampleStream(redis);
    const addingJobs = [];
    stream.on('data', (listOfSamples) => {
      addingJobs.push(addEntriesToAspectSubjectMap(redis, listOfSamples)
        .then(() => {
          log(`Added ${listOfSamples.length} aspects to subjectAspectMap`);
        }));
    });

    stream.on('end', () => {
      Promise.all(addingJobs)
        .then(resolve)
        .catch(reject);
    });
  });
}

module.exports = populateSubjectAspectMap;
