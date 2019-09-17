/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/attributesAsKeys/aspectAttributesAsKeys.js
 */
const expect = require('chai').expect;
const aspectAttributesAsKeys =
  require('../../../src/sampleStore/attributesAsKeys/aspectAttributesAsKeys');
const Redis = require('ioredis-mock');
const redis = new Redis();
const samsto = require('../../../src/sampleStore/constants');
const aspTagsPfx = samsto.pfx.aspectTags;
const aspWritersPfx = samsto.pfx.aspectWriters;
const aspRangesPfx = samsto.pfx.aspectRanges;

describe('test/sampleStore/attributesAsKeys/aspectAttributesAsKeys.js >', () => {
  const aspect1 = { // basic ranges
    name: 'aspect1'.toLowerCase(),
    isPublished: 'true',
    tags: JSON.stringify(['onetag']),
    writers: JSON.stringify(['user1']),
    criticalRange: JSON.stringify([0, 1]),
    warningRange: JSON.stringify([2, 3]),
    infoRange: JSON.stringify([4, 4]),
    okRange: JSON.stringify([5, 10]),
  };

  const aspect2 = { // negative int ranges with undefined range in the middle
    name: 'aspect2'.toLowerCase(),
    isPublished: 'true',
    tags: JSON.stringify(['aspect', 'published', 'multipleTags']),
    writers: JSON.stringify(['user1', 'user2', 'user3']),
    criticalRange: JSON.stringify([-10, -1]),
    warningRange: JSON.stringify(([0, 0])),
    okRange: JSON.stringify([1, 10]),
  };

  const aspect3 = { // null and non-contiguous ranges
    name: 'aspect3'.toLowerCase(),
    isPublished: 'true',
    criticalRange: JSON.stringify([0, 10]),
    warningRange: null,
    infoRange: JSON.stringify([20, 30]),
    okRange: null,
  };

  const aspect4 = { // ranges touching edges reverse order
    name: 'aspect4'.toLowerCase(),
    isPublished: 'true',
    criticalRange: JSON.stringify([10, 15]),
    warningRange: JSON.stringify([5, 10]),
    infoRange: JSON.stringify([0, 5]),
  };

  const aspect5 = { // touching edges, singular ranges, reverse (lower value has precedence)
    name: 'aspect5'.toLowerCase(),
    isPublished: 'true',
    criticalRange: JSON.stringify([0, 5]),
    warningRange: JSON.stringify([5, 5]),
    infoRange: JSON.stringify([5, 10]),
    okRange: JSON.stringify([10, 10]),
  };

  const aspect6 = { // decimal ranges
    name: 'aspect6'.toLowerCase(),
    isPublished: 'true',
    criticalRange: JSON.stringify([0, 2.5]),
    warningRange: JSON.stringify([2.5, 3.1]),
    infoRange: JSON.stringify([3.2, 5]),
    okRange: null,
  };

  const aspUnPub = { // unpublished aspect
    name: 'aspUnPub'.toLowerCase(),
    isPublished: 'false',
    tags: JSON.stringify(['unpublished']),
    writers: JSON.stringify(['user']),
  };

  before((done) => {
    redis.pipeline()
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect1.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect2.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect3.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect4.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect5.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect6.name}`)
      .sadd('samsto:aspects',
        `samsto:aspect:${aspUnPub.name}`)
      .hmset(`samsto:aspect:${aspect1.name}`, aspect1)
      .hmset(`samsto:aspect:${aspect2.name}`, aspect2)
      .hmset(`samsto:aspect:${aspect3.name}`, aspect3)
      .hmset(`samsto:aspect:${aspect4.name}`, aspect4)
      .hmset(`samsto:aspect:${aspect5.name}`, aspect5)
      .hmset(`samsto:aspect:${aspect6.name}`, aspect6)
      .hmset(`samsto:aspect:${aspUnPub.name}`, aspUnPub)
      .exec()
      .then(() => done());
  });

  it('ok - aspect tags are added as keys', (done) => {
    aspectAttributesAsKeys(redis, false)
      .then(() => Promise.all([

        // aspect tags keys exists
        redis.exists(`${aspTagsPfx}${aspect1.name}`),
        redis.exists(`${aspTagsPfx}${aspect2.name}`),
        redis.exists(`${aspTagsPfx}${aspUnPub.name}`),

        // checks tags set members
        redis.smembers(`${aspTagsPfx}${aspect1.name}`),
        redis.smembers(`${aspTagsPfx}${aspect2.name}`),
        redis.smembers(`${aspTagsPfx}${aspUnPub.name}`),

        // aspect writers key exists
        redis.exists(`${aspWritersPfx}${aspect1.name}`),
        redis.exists(`${aspWritersPfx}${aspect2.name}`),
        redis.exists(`${aspWritersPfx}${aspUnPub.name}`),

        // check aspect writers set members
        redis.smembers(`${aspWritersPfx}${aspect1.name}`),
        redis.smembers(`${aspWritersPfx}${aspect2.name}`),
        redis.smembers(`${aspWritersPfx}${aspUnPub.name}`),

        // different range cases, check range key exists and check members
        redis.exists(`${aspRangesPfx}${aspect1.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect1.name}`, '-inf', '+inf', 'WITHSCORES'),

        redis.exists(`${aspRangesPfx}${aspect2.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect2.name}`, '-inf', '+inf', 'WITHSCORES'),

        redis.exists(`${aspRangesPfx}${aspect3.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect3.name}`, '-inf', '+inf', 'WITHSCORES'),

        redis.exists(`${aspRangesPfx}${aspect4.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect4.name}`, '-inf', '+inf', 'WITHSCORES'),

        redis.exists(`${aspRangesPfx}${aspect5.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect5.name}`, '-inf', '+inf', 'WITHSCORES'),

        redis.exists(`${aspRangesPfx}${aspect6.name}`),
        redis.zrangebyscore(`${aspRangesPfx}${aspect6.name}`, '-inf', '+inf', 'WITHSCORES'),
      ]))
      .then((res) => {
        // aspect tags keys exists
        expect(res[0]).to.equal(1);
        expect(res[1]).to.equal(1);
        expect(res[2]).to.equal(0);

        // checks tags set members
        expect(res[3]).to.deep.equal(['onetag']);
        expect(res[4]).to.deep.equal(['aspect', 'published', 'multipleTags']);
        expect(res[5]).to.deep.equal([]);

        // aspect writers key exists
        expect(res[6]).to.equal(1);
        expect(res[7]).to.equal(1);
        expect(res[8]).to.equal(0);

        // check aspect writers set members
        expect(res[9]).to.deep.equal(['user1']);
        expect(res[10]).to.deep.equal(['user1', 'user2', 'user3']);
        expect(res[11]).to.deep.equal([]);

        // basic range: key exists and check members
        expect(res[12]).to.equal(1);
        expect(res[13]).to.deep.equal(
          ['3:min:Critical', '0',
          '0:max:Critical', '1',
          '0:max:OK', '10',
          '3:min:Warning', '2',
          '0:max:Warning', '3',
          '1:min:Info', '4',
          '2:max:Info', '4',
          '3:min:OK', '5',
          ]);

        /* negative int ranges with undefined range in the middle:
        check key and members */
        expect(res[14]).to.equal(1);
        expect(res[15]).to.deep.equal([
          '0:max:Critical',
          '-1',
          '3:min:Critical',
          '-10',
          '1:min:Warning',
          '0',
          '2:max:Warning',
          '0',
          '3:min:OK',
          '1',
          '0:max:OK',
          '10',
        ]);

        // null and non-contiguous ranges: check key and members
        expect(res[16]).to.equal(1);
        expect(res[17]).to.deep.equal(['3:min:Critical',
          '0',
          '0:max:Critical',
          '10',
          '3:min:Info',
          '20',
          '0:max:Info',
          '30',
        ]);

        // ranges touching edges reverse order: check key and members
        expect(res[18]).to.equal(1);
        expect(res[19]).to.deep.equal(['3:min:Info',
          '0',
          '3:min:Critical',
          '10',
          '0:max:Warning',
          '10',
          '0:max:Critical',
          '15',
          '3:min:Warning',
          '5',
          '0:max:Info',
          '5',
        ]);

        /* touching edges, singular ranges, reverse (lower value has precedence)
        check key and members */
        expect(res[20]).to.equal(1);
        expect(res[21]).to.deep.equal(['3:min:Critical',
          '0',
          '0:max:Info',
          '10',
          '1:min:OK',
          '10',
          '2:max:OK',
          '10',
          '0:max:Critical',
          '5',
          '1:min:Warning',
          '5',
          '2:max:Warning',
          '5',
          '3:min:Info',
          '5',
        ]);

        // decimal ranges: check key and members
        expect(res[22]).to.equal(1);
        expect(res[23]).to.deep.equal(['3:min:Critical',
          '0',
          '0:max:Critical',
          '2.5',
          '3:min:Warning',
          '2.5',
          '0:max:Warning',
          '3.1',
          '3:min:Info',
          '3.2',
          '0:max:Info',
          '5',
        ]);
        done();
      })
      .catch(done);
  });
});
