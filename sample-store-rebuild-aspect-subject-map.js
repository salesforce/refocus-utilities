/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * sample-store-rebuild-aspect-subject-map.js
 *
 * Rebuild the Sample Store's Aspect-Subject Map in redis.
 * If user provides a redisUrl, use that. Otherwise, if there is a "REDIS_URL"
 * environment variable, use that. Otherwise, try local default redis instance.
 */
'use strict';
const cmdName = 'sample-store-rebuild-aspect-subject-map';
const debug = require('debug')('refocus-utilities');
const commandLineArgs = require('command-line-args');
const Redis = require('ioredis');
const asmDelete = require('./src/sampleStore/aspectSubjectMap/delete');
const asmPopulate = require('./src/sampleStore/aspectSubjectMap/populate');
const cli = require('./src/cli/sample-store-rebuild-aspect-subject-map');
const startTime = new Date();
const options = commandLineArgs(cli.optionDefinitions);
const localRedis = 'redis://localhost:6379';

cli.showUsage(options);

const redisUrl = options.redisUrl || process.env.REDIS_URL || localRedis;
console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);

// Delete and rebuild the Aspect-Subject Map
asmDelete(redis)
.then(() => asmPopulate(redis))
.then(() => {
  console.log('Success! [%dms]', new Date() - startTime);
  process.exit(0);
})
.catch((err) => {
  console.error(err.message);
  process.exit(1);
});
