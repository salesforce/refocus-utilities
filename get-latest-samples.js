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
let count = 0;


console.log('Starting to grab data');
stream.on('data', (found) => {
  console.log(found.length, count);
  found.forEach((sample) => {
    redis.hgetall(sample)
   .then((s) => {
      const updateTime = s.updatedAt;
        // compare
        if (new Date(updateTime) >= new Date(oneMinuteLessTime)) {
          count++;
          sampleList.push(s.name);
        }
      });
  });
});

stream.on('end', () => {
  console.log(count);
  console.log(sampleList);
  process.exit(0);
});

// postgres://us1cpb1nudctv:p31e5c1b50574fef88b873c989f058e10879c01394f4a2ff97b1571513e72346e@ec2-52-21-122-26.compute-1.amazonaws.com:5432/dbcpvn1oq71iuanp