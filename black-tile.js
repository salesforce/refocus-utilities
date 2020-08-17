const debug = require('debug')('refocus-utilities:black-tile');
const Redis = require('ioredis');
const checkSamplesAgainstSubAspMap =
    require('./src/sampleStore/subjectAspectMap/checkSamplesAgainstSubAspMap');
const deleteAspectSubjectMap =
    require('./src/sampleStore/subjectAspectMap/delete.js');
const populateAspectSubjectMap =
    require('./src/sampleStore/subjectAspectMap/populate.js');


const rootSubjectKey = process.env.ROOT_SUBJECT || '';
const frequency = process.env.FREQUENCY || '3600000';
const localRedis = 'redis://localhost:6379';
const redisUrl = process.env.REDIS_URL || localRedis;
const redisConnection = new Redis(redisUrl);

/**
  * Checks if subject aspect map is correctly in tact, if not then
  * deletes it and rebuilds it.
  * @param {object} redis - instance of ioredis connection to redis.
  * @param {string} subjectKey - root subject to begin check on. Will check this and all subjects
  * below it in the hierarchy
	*/
async function blackTileCheckAndRebuild(redis, subjectKey) {
  debug(`Running black tile check with root subject: ${subjectKey}`);
  const samplesInSubAspMap = await checkSamplesAgainstSubAspMap(redis, subjectKey);
  const { total, foundInMap } = samplesInSubAspMap;
  const numberOfMissingSamples = total - foundInMap;
  if (numberOfMissingSamples > 0) {
    debug(`SubjectAspectMapError: ${numberOfMissingSamples} samples missing from the ` +
      'subject aspect map... rebuilding');
    const numberOfDeletedSubjectAspectMaps = await deleteAspectSubjectMap(redis, subjectKey);
    debug(`Deleted ${numberOfDeletedSubjectAspectMaps} entries from the subaspmap`);
    const numberOfEntriesAddedToSubjectAspectMap =
      await populateAspectSubjectMap(redis, subjectKey);
    debug('Subject aspect map population complete: ' +
      `added ${numberOfEntriesAddedToSubjectAspectMap} entries`);
  } else {
    debug('No missing samples in aspect subject map :)');
  }
}

blackTileCheckAndRebuild(redisConnection, rootSubjectKey);
setInterval(() => blackTileCheckAndRebuild(redisConnection, rootSubjectKey), frequency);
