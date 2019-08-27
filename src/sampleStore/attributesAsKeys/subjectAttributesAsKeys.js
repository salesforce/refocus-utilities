/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/attributesAsKeys/subjectAttributesAsKeys.js
 *
 * Populate the Sample Store with Subject tags as individual keys.
 * eg. samsto:tags:subject:{subjectName} -> set of tags
 */
'use strict';
const debug = require('debug')
('refocus-utilities:sampleStore:subjectAttributesAsKeys');
const samsto = require('../constants');

module.exports = (redis, preview=true) => redis.smembers(samsto.key.subjects)
    .then((subjectKeys) => {
      debug('%d samsto:subject:___ keys found %o', subjectKeys.length,
        subjectKeys);
      const getSubjectsCmds = subjectKeys.map((subjKey) => ['hgetall', subjKey]);
      return redis.multi(getSubjectsCmds).exec();
    })
    .then((getSubjsResults) => {
      const subjTagsSetCmds = [];
      getSubjsResults.forEach((subjRes) => {
        const subject = subjRes[1];
        const subjAbsPath = subject.absolutePath.toLowerCase();
        if (subject.isPublished === 'true') {
          if (subjAbsPath && subject.tags && typeof subject.tags === 'string') {
            const tags = JSON.parse(subject.tags);
            if (!Array.isArray(tags)) {
              throw new Error(`Invalid tags values: ${tags}`);
            }

            if (tags.length) {
              const cmd = ['sadd', `${samsto.pfx.subjectTags}${subjAbsPath}`, ...tags];
              subjTagsSetCmds.push(cmd);
            }
          }
        }
      });

      if (preview) {
        debug('[Preview mode] %d commands to be executed: %o',
          subjTagsSetCmds.length, subjTagsSetCmds);
        return Promise.resolve();
      }

      debug('%d commands executing: %o', subjTagsSetCmds.length, subjTagsSetCmds);
      return redis.multi(subjTagsSetCmds).exec();
    })
    .then(() => debug('Success!'))
    .catch((err) => console.error(err));
