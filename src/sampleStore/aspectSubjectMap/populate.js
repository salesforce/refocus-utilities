/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/aspectSubjectMap/populate.js
 *
 * Populate the Sample Store's Aspect-Subject Map based on the members of the
 * "samsto:subjects" set and their references to the Subject-Aspect Map.
 */

const debug = require('debug')('refocus-utilities:sampleStore:aspectSubjectMap:populate');
const samsto = require('../constants');
const helpers = require('../helpers');

module.exports = (redis) => {
  let subjects;

  /* Retrieve the members of the "samsto:subjects" set. */
  return redis.smembers(samsto.key.subjects)
    .then((subjectKeys) => {
      debug('%d samsto:subject:___ keys found %O', subjectKeys.length,
        subjectKeys);

      /*
     * Each member of the set has a "samsto:subject:" prefix before the subject
     * absolutePath (e.g. "samsto:subject:myrootsubject.mysubject"), so remove
     * that prefix...
     */
      return helpers.replacePrefix(subjectKeys, samsto.pfx.subject, '');
    })

  /* ... save the array of just the actual subject absolutePaths... */
    .then((arr) => {
      subjects = arr ;
    })

  /*
   * ... then prepend each subject absolutePath with "samsto:subaspmap:" (e.g.
   * "samsto:subaspmap:myrootsubject.mysubject").
   */
    .then(() => helpers.replacePrefix(subjects, '', samsto.pfx.sam))

  /* Retrieve the members of each of those sets. */
    .then((samKeys) => {
      const pipeline = redis.pipeline();
      samKeys.forEach((samKey) => pipeline.smembers(samKey));
      return pipeline.exec();
    })

  /*
   * Add each subject absolutePath to the appropriate "samsto:aspsubmap:____"
   * set for each of its aspects.
   */
    .then((subjectAspects) => {
      const pipeline = redis.pipeline();
      subjectAspects.forEach((subaspmap, idx) =>
        subaspmap[1].forEach((a) =>
          pipeline.sadd(samsto.pfx.asm + a, subjects[idx])));
      return pipeline.exec();
    })
    .then((res) => debug('%d sadd commands executed', res.length))
    .then(() => debug('Success!'));
};
