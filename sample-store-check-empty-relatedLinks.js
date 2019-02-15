const Redis = require('ioredis');
const samsto = require('./src/sampleStore/constants');
const commandLineArgs = require('command-line-args');

const optionDefinitions = [
  {
    name: 'redisUrl',
    alias: 'r',
    description:
      'The redis connection url (defaults to process.env.REDIS_URL or ' +
      'redis://localhost:6379).',
    type: String,
  },
];

const options = commandLineArgs(optionDefinitions);

const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
// console.log(`${cmdName} (redisUrl = "${redisUrl}")`);
const redis = new Redis(redisUrl);

return redis.smembers(samsto.key.samples)
.then((sampleNames) => {
  // console.log(sampleNames);
  const commands = sampleNames.map(sample => ['hgetall', sample]);
  return redis.multi(commands).exec();
})
.then((samples) => {
  samples.forEach((samp) => {
    const sample = samp[1];
      // console.log(sample);
    if (sample && sample.relatedLinks) {
      if (sample.relatedLinks == 'null' || sample.relatedLinks == 'undefined') {
        console.log(sample);
      }
    }
  })
  console.log("Done...");
  return Promise.resolve();
})