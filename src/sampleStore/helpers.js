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
};
