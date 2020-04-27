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
  const subject1 = {
    name: 'subj1',
    absolutePath: 'subj2',
    isPublished: true,
  };

  const subject2 = {
    name: 'subj2',
    absolutePath: 'subj2',
    isPublished: true,
  };

  const subject3 = {
    name: 'subj3',
    absolutePath: 'subj3',
    isPublished: true,
  };

  const subject4 = {
    name: 'subj4',
    absolutePath: 'subj4',
    isPublished: true,
  };

  const subject5 = {
    name: 'subj5',
    absolutePath: 'subj5',
    isPublished: true,
  };

  const aspect1 = {
    name: 'asp1',
    isPublished: true,
  };

  const aspect2 = {
    name: 'asp2',
    isPublished: true,
  };

  const sample1 = {
    name: 'subj1|asp1',
    subjectId: '123',
    aspectId: '123',
  };

  const sample2 = {
    name: 'subj2|asp2',
    subjectId: '123',
    aspectId: '123',
  };

  const sample3 = {
    name: 'subj3|asp1',
    aspectId: '123',
  };

  const sample4 = {
    subjectId: '123',
    aspectId: '123',
  };

  const sample5 = {
    name: 'subj2|asp1',
    subjectId: '123',
  };

  const sample6 = {
    name: 'subj3',
    subjectId: '123',
    aspectId: '123',
  };

  const sample7 = {
    name: 'subj3|asp1',
    subjectId: '123',
    aspectId: '123',
  };

  const sample8 = {
    name: '|asp2',
    subjectId: '123',
    aspectId: '123',
  };

  before((done) => {
    redis.pipeline()
      .sadd('samsto:samples',
        'samsto:sample:subj1|asp1',
        'samsto:sample:subj1|asp2', // invalid name in hash
        'samsto:sample:subj2|asp1', // no hash
        'samsto:sample:subj2|asp2',
        'samsto:sample:subj1|aspNoHash', // asp absent
        'samsto:sample:subj3|asp2', // invalid sample object
        'samsto:sample:subj4|asp1', // invalid sample object
        'samsto:sample:subj4|asp2', // invalid sample object
        'samsto:sample:subj5|asp1', // invalid sample object
        'samsto:sample:subjNoHash|asp1') // subj absent
      .hmset('samsto:aspect:asp1', aspect1)
      .hmset('samsto:aspect:asp2', aspect2)
      .hmset('samsto:subject:subj1', subject1)
      .hmset('samsto:subject:subj2', subject2)
      .hmset('samsto:subject:subj3', subject3)
      .hmset('samsto:subject:subj4', subject4)
      .hmset('samsto:subject:subj5', subject5)
      .hmset('samsto:sample:subj1|asp1', sample1)
      .hmset('samsto:sample:subj2|asp2', sample2)
      .hmset('samsto:sample:subjNoHash|asp1', sample3) // subj absent
      .hmset('samsto:sample:subj1|aspNoHash', sample4) // asp absent
      .hmset('samsto:sample:subj3|asp1', sample3) // not present in master
      .hmset('samsto:sample:subj3|asp2', sample5) // invalid sample
      .hmset('samsto:sample:subj4|asp1', sample6) // invalid sample
      .hmset('samsto:sample:subj4|asp2', sample7) // invalid sample
      .hmset('samsto:sample:subj5|asp1', sample8) // invalid sample
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
        expect(res1).to.deep.equal(['samsto:sample:subj1|asp1', 'samsto:sample:subj2|asp2']);
        expect(res2.length).equals(3);
        expect(res2).to.include('samsto:samples');
        expect(res2).to.include('samsto:sample:subj1|asp1');
        expect(res2).to.include('samsto:sample:subj2|asp2');

        done();
      })
      .catch(done);
  });
});
