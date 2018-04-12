/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/aspectSubjectMap/populate.js
 */
const expect = require('chai').expect;
const asmPopulate =
  require('../../../src/sampleStore/aspectSubjectMap/populate');
const Redis = require('ioredis-mock');
const redis = new Redis();

describe('test/sampleStore/aspectSubjectMap/populate.js >', () => {
  before((done) => {
    const pipeline = redis.pipeline()
    .sadd('samsto:subjects',
      'samsto:subject:canada',
      'samsto:subject:canada.manitoba',
      'samsto:subject:canada.ontario',
      'samsto:subject:canada.quebec')
    .sadd('samsto:subaspmap:canada')
    .sadd('samsto:subaspmap:canada.manitoba', 'humidity', 'temperature')
    .sadd('samsto:subaspmap:canada.ontario', 'temperature')
    .sadd('samsto:subaspmap:canada.quebec', 'humidity')
    .exec()
    .then(() => done());
  });

  it('ok - samsto:aspsubmap:___ added', (done) => {
    asmPopulate(redis)
    .then(() => redis.smembers('samsto:aspsubmap:humidity'))
    .then((humidity) => expect(humidity)
      .to.deep.equal(['canada.manitoba', 'canada.quebec']))
    .then(() => redis.smembers('samsto:aspsubmap:temperature'))
    .then((temperature) => expect(temperature)
      .to.deep.equal(['canada.manitoba', 'canada.ontario']))
    .then(() => done());
  });
});
