/**
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * sample-store-check-subject-aspect-map.js
 *
 * Check the subject aspect map against the current list of samples to see how
 * many, if any, are missing.
 * If user provides a redisUrl, use that. Otherwise, if there is a "REDIS_URL"
 * environment variable, use that. Otherwise, try local default redis instance.
 */

const cmdName = 'sample-store-check-subject-aspect-map';
const samCheck = require('./src/sampleStore/subjectAspectMap/checkSamplesAgainstSubAspMap');
const commandLineArgs = require('command-line-args');
const Redis = require('ioredis');
const cli = require('./src/cli/sample-store-check-subject-aspect-map');
const startTime = new Date();
const options = commandLineArgs(cli.optionDefinitions);
const localRedis = 'redis://localhost:6379';

cli.showUsage(options);

const redisUrl = options.redisUrl || process.env.REDIS_URL || localRedis;

console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);

samCheck(redis).then((results) => {
  console.log(`Process Complete, out of ${results.total} samples, ${results.foundInMap} ` +
  'were found in the subject aspect map.');
  console.log(new Date() - startTime);
  process.exit(0);
}).catch((err) => {
  console.log(err);
  process.exit(1);
});
