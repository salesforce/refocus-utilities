/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/statusCalculation.js
 */
'use strict'; // eslint-disable-line strict
const samsto = require('../constants');
const statusPrecedence = {
  OK: 1,
  Info: 2,
  Warning: 3,
  Critical: 4,
};

module.exports = {
  getAspectRanges,
  preprocessOverlaps,
  setRanges,
};

/**
 * Convert aspect object to array of ranges
 *
 * @param  {Object} aspect - aspect object, with range fields
 * @returns {Array<Object>} - array of ranges, in ascending order
 */
function getAspectRanges(aspect) {
  const ranges = {
    OK: aspect.okRange,
    Info: aspect.infoRange,
    Warning: aspect.warningRange,
    Critical: aspect.criticalRange,
  };

  const rangeArr = Object.entries(ranges)
  .filter(([status, range]) => range)
  .map(([status, range]) => Range(status, range));

  console.log('before sort', rangeArr);
  const sorted = rangeArr.sort((r1, r2) => {
    const ret = r1.min === r2.min ? r1.max - r2.max : r1.min - r2.min;
    console.log('...', r1, r2);
    console.log('->', ret);
    return ret;
  });
  console.log('after sort', sorted);
  return sorted;
}

/**
 * Send redis commands to set keys for the given ranges
 *
 * @param  {Object} batch - active redis batch
 * @param  {Array<Object>} ranges - sorted, non-overlapping list of aspect ranges
 * @param  {String} key - redis key
 */
function setRanges(batch, ranges, key) {
  ranges.map((range) =>
    batch
    .zadd(key, range.min, getRangeKey('min', range.status, range.min))
    .zadd(key, range.max, getRangeKey('max', range.status, range.max))
  );
}

/**
 * Get set members for a given range
 *
 * @param  {String} type - "min" or "max"
 * @param  {String} status - "Critical"/"Warning"/"Info"/"OK"
 * @param  {String} score - range score
 * @returns {Object} - { minKey, maxKey }
 */
function getRangeKey(type, status, score) {
  const order = (type === 'min') ? 0 : 1; // min comes before max
  return `${order}:${type}:${status}:${score}`;
}

/**
 * Find all overlapping ranges, merging them together in-place to form new
 * non-overlapping ranges based on the status precedence
 *
 * @param  {Array<Object>} rangesToMerge - list of ranges, in ascending order.
 * @returns {Array<Object>} - list of ranges with no overlaps, in ascending order
 */
function preprocessOverlaps(rangesToMerge) {
  const mergedRanges = [];
  while (rangesToMerge.length) {
    console.log('rangesToMerge', rangesToMerge);
    const ranges = [rangesToMerge.shift(), rangesToMerge.shift()];
    const mergeResult = mergeOverlappingRanges(...ranges);
    console.log('mergeResult', mergeResult);

    let done;
    let next;
    if (mergeResult.length > 1) {
      [done, ...next] = mergeResult;
    } else if (mergeResult.length === 1) {
      [...next] = mergeResult;
    } else {
      [done] = ranges;
    }

    done && mergedRanges.push(done);
    next && rangesToMerge.unshift(...next);
  }

  return mergedRanges;
}

/**
 * Given two overlapping ranges, returns 1-3 non-overlapping ranges to
 * replace them, prioritized by status.
 *
 * @param  {Object} range1 - the range with the lower min value
 * @param  {Object} range2 - the range with the higher min value
 * @returns Array<Object>
 */
function mergeOverlappingRanges(range1, range2) {
  console.log('mergeOverlappingRanges', range1, range2);
  if (!range1 || !range2) return [];

  const range1Priority = statusPrecedence[range1.status];
  const range2Priority = statusPrecedence[range2.status];

  const encompassing = (range1.min <= range2.min)
    && (range2.max <= range1.max);
  const overlapping = (range1.min < range2.min)
    && (range1.max > range2.min)
    && (range1.max < range2.max);
  const touching = !encompassing && (range1.max === range2.min);

  if (touching) {
    console.log('touching');

    // for touching flat ranges, remove the range completely if it's lower priority
    if (range1.min === range1.max && range1Priority < range2Priority) {
      console.log(1);
      return [range2];
    } else if (range2.min === range2.max && range2Priority < range1Priority) {
      console.log(2);
      return [range1];
    }

    // remove the edge from the lower-priority range
    if (range1Priority < range2Priority) {
      console.log(3);
      range1.max = adjustDown(range1.max);
    } else {
      console.log(4);
      range2.min = adjustUp(range2.min);
    }

    return [range1, range2];
  } else if (overlapping) {
    console.log('overlapping');

    // truncate lower-priority range
    if (range1Priority < range2Priority) {
      console.log(1);
      range1.max = adjustDown(range2.min);
    } else {
      console.log(2);
      range2.min = adjustUp(range1.max);
    }

    return [range1, range2];
  } else if (encompassing) {
    console.log('encompassing');
    if (range1Priority < range2Priority) {
      console.log(1);

      // break up into three ranges
      const low = Range(range1.status, [range1.min, adjustDown(range2.min)]);
      const middle = Range(range2.status, [range2.min, range2.max]);
      const high = Range(range1.status, [adjustUp(range2.max), range1.max]);
      return [low, middle, high].filter(r => r.min <= r.max);
    } else {
      console.log(2);

      // remove range 2
      return [range1];
    }
  } else {
    console.log('as-is');

    // if not touching, overlapping, or encompassing, return ranges as-is.
    return [range1, range2];
  }
}

/**
 * Adjust the given value down by the smallest possible amount that is
 * representable in floating point
 *
 * @param  {Number} n
 * @returns {Number}
 */
function adjustDown(n) {
  let best = n;
  let adjustment = .1;
  let nextTry = n - adjustment;

  while (nextTry !== n) {
    best = nextTry;
    adjustment /= 10;
    nextTry = n - adjustment;
  }

  console.log(`-- adjustDown ${n} -> ${best}, ${adjustment}`);
  return best;
}

/**
 * Adjust the given value up by the smallest possible amount that is
 * representable in floating point
 *
 * @param  {Number} n
 * @returns {Number}
 */
function adjustUp(n) {
  let best = n;
  let adjustment = .1;
  let nextTry = n + adjustment;

  while (nextTry !== n) {
    best = nextTry;
    adjustment /= 10;
    nextTry = n + adjustment;
  }

  console.log(`-- adjustUp ${n} -> ${best}, ${adjustment}`);
  return best;
}

function Range(status, range) {
  if (range && typeof range === 'string') {
    range = JSON.parse(range);
    if (!Array.isArray(range) || range.length !== 2) {
      throw new Error(`Invalid ${status} range value: ${range}`);
    }
  }

  return {
    status,
    min: range[0],
    max: range[1],
  };
}
