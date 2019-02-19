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
  const commands = sampleNames.map(sample => ['hgetall', sample]);
  return redis.multi(commands).exec();
})
.then((samples) => {
  const updateCmds = [];
  samples.forEach((samp) => {
    const sample = samp[1];
    if (sample && sample.relatedLinks) {
      if (sample.relatedLinks == 'null' || sample.relatedLinks == 'undefined') {
        console.log(sample.relatedLinks);
        updateCmds.push(['hset', `samsto:sample:${sample.name.toLowerCase()}`, 'relatedLinks', '[]']);
      }
    }
  })
  console.log("starting updates...", updateCmds.length);
  return redis.multi(updateCmds).exec();
})
.then((updatedSamples) => {
  console.log("Done updates...", updatedSamples.length);
  updatedSamples.forEach((res) => {
    if (res[1] !== 0) {
      console.log("Returned value: ", res[1]);
    }
  })

  console.log("Done....");
  return Promise.resolve();
})