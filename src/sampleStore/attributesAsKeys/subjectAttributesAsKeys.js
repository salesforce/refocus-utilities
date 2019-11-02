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

module.exports = (redis, clear=false, preview=true) => redis.smembers(samsto.key.subjects)
    .then((subjectKeys) => {
      debug('%d samsto:subject:___ keys found', subjectKeys.length);
      subjectKeys.forEach((key) =>
        debug(key)
      );
      const getSubjectsCmds = subjectKeys.map((subjKey) => ['hgetall', subjKey]);
      return redis.multi(getSubjectsCmds).exec();
    })
    .then((getSubjsResults) => {
      const batch = redis.multi();
      getSubjsResults.forEach((subjRes) => {
        const subject = subjRes[1];
        const subjAbsPath = subject.absolutePath.toLowerCase();
        if (subject.isPublished === 'true') {
          const tagsKey = `${samsto.pfx.subjectTags}${subjAbsPath}`;
          const existsKey = `${samsto.pfx.subjectExists}${subjAbsPath}`;
          batch.del(tagsKey);
          batch.del(existsKey);
          if (clear) return;

          if (subjAbsPath) {
            if (subject.tags && typeof subject.tags === 'string') {
              const tags = JSON.parse(subject.tags);
              if (!Array.isArray(tags)) {
                throw new Error(`Invalid tags values: ${tags}`);
              }

              if (tags.length) {
                batch.sadd(tagsKey, ...tags);
              }
            }

            batch.set(existsKey, 'true');
          }
        }
      });

      const cmds = batch._queue
        .filter(cmd => cmd.name !== 'multi')
        .map(cmd => `${cmd.name}(${cmd.args.join(', ')})`);
      if (preview) {
        debug('[Preview mode] %d commands to be executed:', cmds.length);
        cmds.forEach((cmd) =>
          debug('[Preview mode] %O', cmd)
        );
        return Promise.resolve();
      }

      debug('%d commands executing:', cmds.length);
      cmds.forEach((cmd) =>
        debug('%O', cmd)
      );
      return batch.exec();
    })
    .then(() => debug('Success!'))
    .catch((err) => console.error(err));
