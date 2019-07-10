/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/sampleStore/helpers.js
 *
 * Helper functions.
 */
'use strict';
const constants = require('./constants');
const samplePrefixLength = constants.pfx.sample.length;
const SEP = ':';

module.exports = {
  /**
   * Replaces pfxToRemove with pfxToAdd in each string element of the array.
   * Leaves empty/null/undefined/non-string array elements unchanged.
   * If pfxToRemove is empty/null/undefined/non-string, just prepend each
   * string element of the array with the pfxToAdd.
   * If pfxToAdd is empty/null/undefined/non-string, just remove the
   * pfxToRemove from the beginning of each string element of the array.
   *
   * @param {Array} arr - An array of strings
   * @param {String} pfxToRemove - A string to remove from the beginning of
   *  each string element of the array
   * @param {String} pfxToAdd - A string to insert at the beginning of each
   *  string element of the array
   * @returns {Array} an array of strings
   */
  replacePrefix: (arr, pfxToRemove, pfxToAdd) => {
    // Not an array or empty array? Done!
    if (!Array.isArray(arr) || !arr.length) return arr;

    const toRemove = typeof pfxToRemove === 'string' ? pfxToRemove : '';
    const toAdd = typeof pfxToAdd === 'string' ? pfxToAdd : '';
    const rex = RegExp('^' + toRemove);
    return arr.map((i) => typeof i === 'string' ? i.replace(rex, toAdd) : i);
  },

  /**
   * Performs some basic validation of the sample:
   * (1) has name which contains valid characters, with valid number of
   *     characters before and after the pipe
   * (2) has aspectId which looks like postgres uuid
   * (3) has subjectId which looks like postgres uuid
   *
   * @params {String} sample - The sample to validate
   * @returns {Boolean} true if sample is valid
   */
  validateSample: (sample) => {
    if (!sample.name || sample.name.indexOf('|') < 1) {
      return false;
    }

    // check subject ID
    if (!sample.subjectId) {
      return false;
    }

    // check aspect ID
    if (!sample.aspectId) {
      return false;
    }

    return true;
  },

  /**
   * Returns true if the key matches the name. Expects key to always be lower-
   * case AND start with "samsto:sample:" so we ignore those first 14 characters
   * then do a lower case string comparison.
   *
	 * @param {String} key - the redis sample store's sample key
	 * @param {String} name - the sample's name attribute
	 * @returns {boolean}
	 */
  sampleKeyNameMatch: (key, name) =>
    key.slice(samplePrefixLength) === name.toLowerCase(),

  /**
   * Get object name from key.
   * @param  {String} key - Key name
   * @returns {String} - Object name
   */
  getNameFromKey(key) {
    const splitArr = key.split(SEP);
    return splitArr[splitArr.length - 1];
  }, // getNameFromKey
};
