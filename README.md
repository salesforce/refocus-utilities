[![Coverage Status](https://coveralls.io/repos/github/salesforce/refocus-utilities/badge.svg?branch=master)](https://coveralls.io/github/salesforce/refocus-utilities?branch=master)

# refocus-utilities

Note: this repository is infrequently maintained.

## Installation

`npm install @salesforce/refocus-utilities`

## Commands

### sample-store-cleanup

Use sample-store-cleanup to clean out bad samples from the Sample Store.

The redis connection url defaults to local redis instance
`redis://localhost:6379`, but if environment variable `REDIS_URL` exists, it
will use that instead. Alternatively, you can pass a redis connection url using
command option `--redisUrl` (or shortcut `-r`).

Use `--preview` (or `-p`) to run in preview mode, to see what keys would be deleted before actually running the cleanup utility for real.

```
Synopsis

  $ node sample-store-cleanup --preview
  $ REDIS_URL=MY_REDIS_CONNECTION_URL node sample-store-cleanup
  $ node sample-store-cleanup [--redisUrl redis://YOUR_REDIS_CONNECTION_URL]
  $ node sample-store-cleanup --help

Options

  -r, --redisUrl string   The redis connection url (defaults to `process.env.REDIS_URL` or `redis://localhost:6379`).
  -h, --help              Print this usage guide
```

### sample-store-rebuild-aspect-subject-map

Use sample-store-rebuild-aspect-subject-map to rebuild the Sample Store's
Aspect-Subject Map in redis.

The redis connection url defaults to local redis instance
`redis://localhost:6379`, but if environment variable `REDIS_URL` exists, it
will use that instead. Alternatively, you can pass a redis connection url using
command option `--redisUrl` (or shortcut `-r`).

```
Synopsis

  $ node sample-store-rebuild-aspect-subject-map
  $ REDIS_URL=MY_REDIS_CONNECTION_URL node sample-store-rebuild-aspect-subject-map
  $ node sample-store-rebuild-aspect-subject-map [--redisUrl redis://YOUR_REDIS_CONNECTION_URL]
  $ node sample-store-rebuild-aspect-subject-map --help

Options

  -r, --redisUrl string   The redis connection url (defaults to `process.env.REDIS_URL` or `redis://localhost:6379`).
  -h, --help              Print this usage guide
```
