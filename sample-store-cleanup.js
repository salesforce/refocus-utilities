/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * sample-store-cleanup.js
 *
 * Clean up sample store
 * - Check for all samples that are present in redis or not which are in master list
 * - Delete keys for samples which are not in the master list
 * - Validate each sample i.e aspectId, subjectId, name and if it failed to
 *   validate then remove that sample key as well as from master list of samples.
 *
 * If user provides a redisUrl, use that. Otherwise, if there is a "REDIS_URL"
 * environment variable, use that. Otherwise, try local default redis instance.
 */
'use strict';
const cmdName = 'sample-store-cleanup';
const debug = require('debug')('refocus-utilities:sample-store-cleanup');
const commandLineArgs = require('command-line-args');
const Redis = require('ioredis');
const cli = require('./src/cli/sample-store-cleanup');
const sampleCleanup = require('./src/sampleStore/sampleCleanup/cleanup');
const previewSampleCleanup = require('./src/sampleStore/sampleCleanup/previewCleanup');
const startTime = new Date();
const options = commandLineArgs(cli.optionDefinitions);
const localRedis = 'redis://localhost:6379';

cli.showUsage(options);

const redisUrl = options.redisUrl || process.env.REDIS_URL || localRedis;
console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);


console.log(options.preview);

if (options.hasOwnProperty('preview')) {
  previewSampleCleanup(redis)
  .then(() => {
    console.log('Success! [%dms]', new Date() - startTime);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
} else {
  sampleCleanup(redis)
  .then(() => {
    console.log('Success! [%dms]', new Date() - startTime);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

