let debug = require('debug');
debug = debug('refocus-utilities:sampleStore:aspectSubjectMap:checkSamplesAgainstSubAspMap');


/**
 * @param {object} redis - ioredis connection object
 * @returns {object} readable stream of sample arrays
 */
function createRedisSampleStream(redis) {
  return redis.scanStream({ match: 'samsto:sample:*', count: 100 });
}

/**
 * @param {string} sampleKey - sample key from redis in the form samsto:sample:<subject>|<aspect>
 * @returns {object} object containing aspect and subject
 */
function getSubjectAndAspectFromSampleKey(sampleKey) {
  const sampleName = sampleKey.split(':')[2];
  const [subject, aspect] = sampleName.split('|');
  return { subject, aspect };
}

/**
 *
 * @param {object} redis - ioRedis object
 * @param {string[]} listOfSamples - array of sample strings from redis
 * @returns {Promise<Array[]>} list of results from checks for existence in subject aspect map
 */
function checkIfEntriesExistInAspectSubjectMap(redis, listOfSamples) {
  return new Promise((resolve, reject) => {
    const pipeline = redis.pipeline();
    listOfSamples.forEach((sampleKey) => {
      const { aspect, subject } = getSubjectAndAspectFromSampleKey(sampleKey);
      pipeline.sismember(`samsto:subaspmap:${subject}`, aspect);
    });
    pipeline.exec().then(resolve).catch(reject);
  });
}

/**
 * @param {object} redis - io redis connection object
 * @returns {Promise} - promise
 */
function checkSamplesAgainstSubAspMap(redis) {
  return new Promise((resolve) => {
    const sampleStream = createRedisSampleStream(redis);
    const processes = [];
    let numberOfSamplesWithAspSubMap = 0;
    let totalNumberOfSamples = 0;
    sampleStream.on('data', (listOfSamples) => {
      processes.push(
        new Promise((end) => {
          totalNumberOfSamples += listOfSamples.length;
          checkIfEntriesExistInAspectSubjectMap(redis, listOfSamples)
            .then((results) => {
              results.forEach(([err, code], i) => {
                if (err) {
                  debug(`Error: ${err}`);
                }
                if (code === 1) {
                  debug(`${listOfSamples[i]} exists in subaspmap`);
                  numberOfSamplesWithAspSubMap += 1;
                }
              });
              end();
            });
        }));
    });

    sampleStream.on('end', () => {
      Promise.all(processes)
        .then(() => {
          resolve({ total: totalNumberOfSamples, foundInMap: numberOfSamplesWithAspSubMap });
        });
    });
  });
}

module.exports = checkSamplesAgainstSubAspMap;
