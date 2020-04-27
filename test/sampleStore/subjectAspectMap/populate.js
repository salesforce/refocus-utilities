/**
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/aspectSubjectMap/populate.js
 */
const expect = require('chai').expect;
const populateSubjectAspectMap =
  require('../../../src/sampleStore/subjectAspectMap/populate');
const Redis = require('ioredis-mock');
const redis = new Redis();

describe('test/sampleStore/subjectAspectMap/populate.js >', () => {
  before((done) => {
    redis.pipeline()
      .sadd('samsto:samples')
      .sadd('samsto:sample:canada|temperature', '50')
      .sadd('samsto:sample:canada|humidity', '25')
      .sadd('samsto:sample:canada.manitoba|temperature', '20')
      .sadd('samsto:sample:canada.ontario|temperature', '21')
      .sadd('samsto:sample:canada.quebec|humidity', '80')
      .exec()
      .then(() => done());
  });

  it('ok - samsto:aspsubmap:___ added', (done) => {
    populateSubjectAspectMap(redis)
      .then(() => redis.smembers('samsto:subaspmap:canada'))
      .then((canada) => expect(canada)
        .to.deep.equal(['temperature', 'humidity']))
      .then(() => redis.smembers('samsto:subaspmap:canada.manitoba'))
      .then((manitoba) => expect(manitoba)
        .to.deep.equal(['temperature']))
      .then(() => done())
      .catch((err) => done(err));
  });
});
