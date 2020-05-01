let debug = require('debug');
debug = debug('refocus-utilities:sampleStore:aspectSubjectMap:checkSamplesAgainstSubAspMap');


/**
 * @param {object} redis - ioredis connection object
 * @param {string} subjectKey - name of subjects to match in redis
 * @returns {object} readable stream of sample arrays
 */
function createRedisSampleStream(redis, subjectKey) {
  const sampleMatch = `samsto:sample:${subjectKey}*`;
  debug(`Scanning for samples matching ${sampleMatch}`);
  return redis.scanStream({ match: sampleMatch, count: 100 });
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
 * @param {string} subjectKey - name of subjects to match in redis,
 * if none is supplied then matches all samples
 * @returns {Promise} - promise
 */
function checkSamplesAgainstSubAspMap(redis, subjectKey = '') {
  return new Promise((resolve) => {
    const sampleStream = createRedisSampleStream(redis, subjectKey);
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
                  numberOfSamplesWithAspSubMap += 1;
                } else {
                  debug(`${listOfSamples[i]} missing from subaspmap`);
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
