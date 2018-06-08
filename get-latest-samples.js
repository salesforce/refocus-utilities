/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * get-letest-samples.js
 */
'use strict';
const cmdName = 'sample-store-cleanup';
const debug = require('debug')('refocus-utilities:sample-store-cleanup');
const commandLineArgs = require('command-line-args');
const Redis = require('ioredis');
const cli = require('./src/cli/sample-store-rebuild-aspect-subject-map');
const startTime = new Date();
const options = commandLineArgs(cli.optionDefinitions);
const localRedis = 'redis://localhost:6379';

cli.showUsage(options);

const redisUrl = options.redisUrl || process.env.REDIS_URL || localRedis;
console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);

const stream = redis.scanStream({ match: 'samsto:sample:*' });

const currentTime = new Date();
const oneMinuteLessTime = new Date(currentTime - 60000);
const sampleList = [];


stream.on('data', (found) => {
  found.forEach((sample) => {
    redis.hgetall(sample)
   .then((s) => {
      const updateTime = s.updatedAt;
        // compare
        if (new Date(updateTime) >= new Date(oneMinuteLessTime)) {
          sampleList.push(s.name);
        }
      });
  });
});

stream.on('end', () => {
  console.log(sampleList);
});
