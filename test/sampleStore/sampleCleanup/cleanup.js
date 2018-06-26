/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/sampleCleanup/cleanup.js
 */
const expect = require('chai').expect;
const sampleCleanup = require('../../../src/sampleStore/sampleCleanup/cleanup');
const Redis = require('ioredis-mock');
const redis = new Redis();

describe('test/sampleStore/sampleCleanup/cleanup.js >', () => {
  const sample1 = {
    name: 'a|aspect',
    subjectId: '123',
    aspectId: '123',
  };

  const sample2 = {
    name: 'b|aspect',
    subjectId: '123',
    aspectId: '123',
  };

  const sample3 = {
    name: 'c|aspect',
    aspectId: '123',
  };

  const sample4 = {
    subjectId: '123',
    aspectId: '123',
  };

  const sample5 = {
    name: 'e|aspect',
    subjectId: '123',
  };

  const sample6 = {
    name: 'f',
    subjectId: '123',
    aspectId: '123',
  };

  const sample7 = {
    name: 'g|aspect',
    subjectId: '123',
    aspectId: '123',
  };

  before((done) => {
    redis.pipeline()
    .sadd('samsto:samples',
      'samsto:sample:a|aspect',
      'samsto:sample:b|aspect',
      'samsto:sample:c|aspect',
      'samsto:sample:d|aspect',
      'samsto:sample:e|aspect',
      'samsto:sample:f|aspect',
      'samsto:sample:h|aspect')
    .hmset('samsto:sample:a|aspect', sample1)
    .hmset('samsto:sample:b|aspect', sample2)
    .hmset('samsto:sample:c|aspect', sample3)
    .hmset('samsto:sample:d|aspect', sample4)
    .hmset('samsto:sample:e|aspect', sample5)
    .hmset('samsto:sample:f|aspect', sample6)
    .hmset('samsto:sample:g|aspect', sample7)
    .exec()
    .then(() => done());
  });

  it('ok - cleanup samplestore', (done) => {
    sampleCleanup(redis)
    .then(() => Promise.all([
      redis.smembers('samsto:samples'),
      redis.keys('samsto:sample*'),
    ]))
    .then(([res1, res2]) => {
      expect(res1).to.deep.equal(['samsto:sample:a|aspect', 'samsto:sample:b|aspect']);
      expect(res2.length).equals(3);
      expect(res2).to.include('samsto:samples');
      expect(res2).to.include('samsto:sample:a|aspect');
      expect(res2).to.include('samsto:sample:b|aspect');

      done();
    });
  });
});
