/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/aspectSubjectMap/delete.js
 */
const expect = require('chai').expect;
const asmDelete = require('../../../src/sampleStore/aspectSubjectMap/delete');
const Redis = require('ioredis-mock');
const redis = new Redis();

describe('test/sampleStore/aspectSubjectMap/delete.js >', () => {
  before((done) => {
    redis.hmset('samsto:aspsubmap:a', { a: 1 })
    .then(() => redis.hmset('somethingelse', 'Should not be deleted'))
    .then(() => done());
  });

  it('ok - matching key deleted, non-matching key not deleted', (done) => {
    asmDelete(redis)
    .then(() => redis.exists('samsto:aspsubmap:a'))
    .then((found) => expect(found).to.equal(0))
    .then(() => redis.exists('somethingelse'))
    .then((found) => expect(found).to.equal(1))
    .then(() => done())
    .catch(done);
  });
});
