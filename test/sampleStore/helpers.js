/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * test/sampleStore/helpers.js
 */
const expect = require('chai').expect;
const helpers = require('../../src/sampleStore/helpers');

describe('test/sampleStore/helpers.js >', () => {
  describe('replacePrefix >', () => {
    const arr = ['blue', 'red', 'yellow', '', null, undefined, 22, 'green'];

    it('ok - remove nothing, add something', () => {
      expect(helpers.replacePrefix(arr, '', 'x'))
      .to.deep.equal([
        'xblue',
        'xred',
        'xyellow',
        'x',
        null,
        undefined,
        22,
        'xgreen',
      ]);
    });

    it('ok - remove something, add nothing', () => {
      expect(helpers.replacePrefix(arr, 'yell', ''))
      .to.deep.equal([
        'blue',
        'red',
        'ow',
        '',
        null,
        undefined,
        22,
        'green',
      ]);
    });

    it('ok - remove something, add something', () => {
      expect(helpers.replacePrefix(arr, 'r', 'belov'))
      .to.deep.equal([
        'blue',
        'beloved',
        'yellow',
        '',
        null,
        undefined,
        22,
        'green',
      ]);
    });

    it('ignore empty/null/undefined/non-string prefix to add', () => {
      expect(helpers.replacePrefix(arr, '', '')).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, '', null)).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, '', undefined)).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, '', 14)).to.deep.equal(arr);
    });

    it('ignore empty/null/undefined/non-string prefix to remove', () => {
      expect(helpers.replacePrefix(arr, '', '')).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, null, '')).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, undefined, '')).to.deep.equal(arr);
      expect(helpers.replacePrefix(arr, 14, '')).to.deep.equal(arr);
    });
  });
});
