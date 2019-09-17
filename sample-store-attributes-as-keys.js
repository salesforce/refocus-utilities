/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * sample-store-attributes-as-keys.js
 *
 * Create subjects tags and aspect tags, writers and ranges keys with corresponding sets.
 *
 * If user provides a redisUrl, use that. Otherwise, if there is a "REDIS_URL"
 * environment variable, use that. Otherwise, try local default redis instance.
 */
'use strict';
const cmdName = 'sample-store-attributes-as-keys';
const debug = require('debug')('refocus-utilities');
const commandLineArgs = require('command-line-args');
const Redis = require('ioredis');
const subjectAttributesAsKeys =
require('./src/sampleStore/attributesAsKeys/subjectAttributesAsKeys');
const aspectAttributesAsKeys =
require('./src/sampleStore/attributesAsKeys/aspectAttributesAsKeys');
const cli = require('./src/cli/sample-store-attributes-as-keys');
const startTime = new Date();
const options = commandLineArgs(cli.optionDefinitions);
const localRedis = 'redis://localhost:6379';

cli.showUsage(options);

const redisUrl = options.redisUrl || process.env.REDIS_URL || localRedis;
console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);

let previewMode;

if (options.hasOwnProperty('preview')) {
  previewMode = true;
} else {
  previewMode = false;
}

subjectAttributesAsKeys(redis, previewMode)
.then(() => aspectAttributesAsKeys(redis, previewMode))
.then(() => {
  console.log('Success! [%dms]', new Date() - startTime);
  process.exit(0);
})
.catch((err) => {
  console.error(err.message);
  process.exit(1);
});
