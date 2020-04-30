
/**
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const debug = require('debug');
const log = debug('refocus-utilities:sampleStore:subjectAspectMap:delete');

/**
 *
 * @param {object} redis - redis connection object
 * @param {string[]} subaspmapList - list of keys to delete from redis
 * @returns {number} - number of deleted subaspmap
 */
function deleteSetOfSubAspMapEntries(redis, subaspmapList) {
  return new Promise((resolve) => {
    const pipeline = redis.pipeline();
    subaspmapList.forEach((subaspmap) => {
      pipeline.del(subaspmap);
    });
    return pipeline.exec((err) => {
      if (err) {
        log(`Error deleting subject aspect maps from redis: ${err}`);
        resolve(0);
      }
      resolve(subaspmapList.length);
    });
  });
}

/**
 * Retrieves all members of subAspMap list, and deletes them
 * @param {Object} redis - redis connection object
 * @param {string} subjectKey - prefix of subaspmap entries to find/delete
 * @returns {Promise} promise which resolves once deletion completes.
 */
function deleteSubAspMap(redis, subjectKey = '') {
  return new Promise((resolve) => {
    const subjectToMatch = `samsto:subaspmap:${subjectKey}*`;
    log(`Scanning for ${subjectToMatch}`);
    const stream = redis.scanStream({ match: subjectToMatch, count: 50 });
    let numberOfSubAspMapEntries = 0;
    const deletionJobs = [];
    stream.on('data', (subaspmapList) => {
      deletionJobs.push(deleteSetOfSubAspMapEntries(redis, subaspmapList)
        .then((numberOfDeletions) => {
          log(numberOfDeletions);
          numberOfSubAspMapEntries += numberOfDeletions;
        }));
    });

    stream.on('end', () => {
      Promise.all(deletionJobs).then(() => {
        log(`Deleted ${numberOfSubAspMapEntries} entries from subaspmap list`);
        resolve();
      });
    });
  });
}

module.exports = deleteSubAspMap;
