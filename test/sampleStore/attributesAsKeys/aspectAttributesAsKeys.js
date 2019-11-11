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
const Redis = require('ioredis');
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
    criticalRange: JSON.stringify([1000, 10000]),
    warningRange: JSON.stringify([750, 1000]),
    infoRange: JSON.stringify([500, 750]),
    okRange: JSON.stringify([0, 500]),
  };

  before((done) => {
    redis.pipeline()
      .sadd('samsto:aspects',
        `samsto:aspect:${aspect1.name}`)
      .hmset(`samsto:aspect:${aspect1.name}`, aspect1)
      .exec()
      .then(() => done());
  });

  after(() => redis.flushall());
  after(() => redis.disconnect());

  it('ok - aspect tags are added as keys', (done) => {
    aspectAttributesAsKeys(redis, false, false)
      .then(() => Promise.all([

        // different range cases, check range key exists and check members
        redis.zrangebyscore(`${aspRangesPfx}${aspect1.name}`, '-inf', '+inf', 'WITHSCORES'),

      ]))
      .then((res) => {
        expect(res[0]).to.deep.equal([
            '0:min:Critical:0', '0',
            '1:max:Critical:1', '1',
            '0:min:Warning:2', '2',
            '1:max:Warning:3', '3',
            '0:min:Info:4', '4',
            '1:max:Info:4', '4',
            '0:min:OK:5', '5',
            '1:max:OK:10', '10',
          ]);
        done();
      })
      .catch(done);
  });
});
