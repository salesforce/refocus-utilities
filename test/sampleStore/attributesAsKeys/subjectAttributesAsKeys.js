/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/attributesAsKeys/subjectAttributesAsKeys.js
 */
const expect = require('chai').expect;
const subjectAttributesAsKeys =
  require('../../../src/sampleStore/attributesAsKeys/subjectAttributesAsKeys');
const Redis = require('ioredis-mock');
const redis = new Redis();
const samsto = require('../../../src/sampleStore/constants');

describe('test/sampleStore/attributesAsKeys/subjectAttributesAsKeys.js >', () => {
  const subjRoot = {
    name: 'subjRoot',
    isPublished: 'true',
    tags: JSON.stringify(['parent', 'root']),
    absolutePath: 'subjRoot'.toLowerCase(),
  };

  const subjChildUnPub = {
    name: 'subjChildUnPub',
    isPublished: 'false',
    tags: JSON.stringify(['child']),
    absolutePath: 'subjRoot.subjChildUnPub'.toLowerCase(),
  };

  const subjChildNoTags = {
    name: 'subjChildNoTags',
    isPublished: 'true',
    tags: JSON.stringify([]),
    absolutePath: 'subjRoot.subjChildNoTags'.toLowerCase(),
  };

  const subjChildOneTag = {
    name: 'subjChildOneTag',
    isPublished: 'true',
    tags: JSON.stringify(['child']),
    absolutePath: 'subjRoot.subjChildOneTag'.toLowerCase(),
  };

  before((done) => {
    redis.pipeline()
      .sadd('samsto:subjects',
        `samsto:subject:${subjRoot.absolutePath}`)
      .sadd('samsto:subjects',
        `samsto:subject:${subjChildUnPub.absolutePath}`)
      .sadd('samsto:subjects',
        `samsto:subject:${subjChildNoTags.absolutePath}`)
      .sadd('samsto:subjects',
        `samsto:subject:${subjChildOneTag.absolutePath}`)
      .hmset(`samsto:subject:${subjChildUnPub.absolutePath}`, subjChildUnPub)
      .hmset(`samsto:subject:${subjChildNoTags.absolutePath}`, subjChildNoTags)
      .hmset(`samsto:subject:${subjChildOneTag.absolutePath}`, subjChildOneTag)
      .hmset(`samsto:subject:${subjRoot.absolutePath}`, subjRoot)
      .exec()
      .then(() => done());
  });

  it('ok - subject attributes are added as keys', (done) => {
    subjectAttributesAsKeys(redis, false)
      .then(() => Promise.all([
        redis.exists(`${samsto.pfx.subjectTags}${subjRoot.absolutePath}`),
        redis.exists(`${samsto.pfx.subjectTags}${subjChildUnPub.absolutePath}`),
        redis.exists(`${samsto.pfx.subjectTags}${subjChildNoTags.absolutePath}`),
        redis.exists(`${samsto.pfx.subjectTags}${subjChildOneTag.absolutePath}`),
        redis.smembers(`${samsto.pfx.subjectTags}${subjRoot.absolutePath}`),
        redis.smembers(`${samsto.pfx.subjectTags}${subjChildUnPub.absolutePath}`),
        redis.smembers(`${samsto.pfx.subjectTags}${subjChildNoTags.absolutePath}`),
        redis.smembers(`${samsto.pfx.subjectTags}${subjChildOneTag.absolutePath}`),
      ]))
      .then(([res1, res2, res3, res4, res5, res6, res7, res8]) => {
        expect(res1).to.equal(1);
        expect(res2).to.equal(0);
        expect(res3).to.equal(0);
        expect(res4).to.equal(1);
        expect(res5).to.deep.equal(['parent', 'root']);
        expect(res6).to.deep.equal([]);
        expect(res7).to.deep.equal([]);
        expect(res8).to.deep.equal(['child']);
        done();
      })
      .catch(done);
  });
});
