const expect = require('chai').expect;
const checkSamplesAgainstSubAspMap =
  require('../../../src/sampleStore/subjectAspectMap/checkSamplesAgainstSubAspMap');
const populateSubjectAspectMap = require('../../../src/sampleStore/subjectAspectMap/populate');
const testSamples = require('./testSampleList');
const Redis = require('ioredis-mock');
const redis = new Redis();

describe('test/sampleStore/subjectAspectMap/checkSubAspMap.js >', () => {
  before((done) => {
    const pipeline = redis.pipeline();
    testSamples.forEach((sample) => {
      pipeline.sadd(sample, '1');
    });

    pipeline.exec()
      .then(() => done());
  });

  it('Should find no entries in subject aspect map', async () => {
    const res = await checkSamplesAgainstSubAspMap(redis);
    expect(res.total).to.equal(testSamples.length);
    expect(res.foundInMap).to.equal(0);
  }).timeout(20000);

  it('Should find all entries are in aspect subject map', async () => {
    await populateSubjectAspectMap(redis);
    const results = await checkSamplesAgainstSubAspMap(redis);
    expect(results.foundInMap).to.equal(testSamples.length);
  }).timeout(20000);
});
