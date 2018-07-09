/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * src/cli/sample-store-cleanup.js
 *
 * Configure the CLI.
 */
'use strict';
const commandLineUsage = require('command-line-usage');

/*
 * Definitions for command line args and options
 * (https://github.com/75lb/command-line-args)
 */
const optionDefinitions = [
  {
    name: 'redisUrl',
    alias: 'r',
    description:
      'The redis connection url (defaults to process.env.REDIS_URL or ' +
      'redis://localhost:6379).',
    type: String,
  },
  {
    name: 'preview',
    alias: 'p',
    description: 'Preview samples which will be deleted',
  },
  {
    name: 'help',
    alias: 'h',
    description: 'Print this usage guide',
  },
];

/*
 * Definitions for generated command line usage information
 * (https://github.com/75lb/command-line-usage)
 */
const sections = [
  {
    header: 'refocus-utilities',
    content:
      'Use {bold sample-store-cleanup} to cleanup the ' +
      'Sample Store\'s samples.',
  },
  {
    header: 'Synopsis',
    content: [
      '  $ node sample-store-cleanup',
      '  $ node sample-store-cleanup [{bold --redisUrl} ' +
        'redis://YOUR_REDIS_CONNECTION_URL]',
      '  $ node sample-store-cleanup {bold --help}',
    ],
    raw: true,
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
];

module.exports = {
  optionDefinitions,
  showUsage: (opts) => {
    if (opts.hasOwnProperty('help')) {
      console.log(commandLineUsage(sections));
      process.exit(0);
    }
  },
};
