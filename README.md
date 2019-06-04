# grounding-search

[![Build Status](https://travis-ci.org/PathwayCommons/grounding-search.svg?branch=master)](https://travis-ci.org/PathwayCommons/grounding-search)

## Required software

- [Node.js](https://nodejs.org/en/) >=8
- [Elasticsearch](https://www.elastic.co/products/elasticsearch) ^6.6.0


## Supported data sources

- NCBI gene (`ncbi`)
- Chebi (`chebi`)
- Uniprot (`uniprot`)

The data sources included by default (e.g. `npm run update`) are `ncbi` and `chebi`.


## Configuration

The following environment variables can be used to configure the server:

- `NODE_ENV` : the environment mode, either `production` or `development` (default)
- `LOG_LEVEL` : the level for the log file (`info`, `warn`, `error`)
- `PORT` : the port on which the server runs (default 3000)
- `ELASTICSEARCH_HOST` : the `host:port` that points to elasticsearch
- `MAX_SEARCH_ES` : the maximum number of results to return from elasticsearch
- `MAX_SEARCH_WS` : the maximum number of results to return in json from the webservice
- `CHUNK_SIZE` : how many grounding entries make up a chunk that gets bulk inserted into elasticsearch
- `MAX_SIMULT_CHUNKS` : maximum number of chunks to insert simulteneously into elasticsearch
- `INPUT_PATH` : the path to the input folder where data files are located
- `INDEX` : the elasticsearch index name to store data from all data sources
- `UNIPROT_FILE_NAME` : name of the file where uniprot data will be read from
- `UNIPROT_URL` : url to download uniprot file from
- `CHEBI_FILE_NAME` : name of the file where chebi data will be read from
- `CHEBI_URL` : url to download chebi file from
- `NCBI_FILE_NAME` : name of the file where ncbi data will be read from
- `NCBI_URL` : url to download ncbi file from

## Run targets

- `npm start` : start the server
- `npm stop` : stop the server
- `npm run watch` : watch mode (debug mode enabled, autoreload)
- `npm run refresh` : run clear, update, then start
- `npm test` : run tests for read only methods (e.g. search and get) assuming that data is already existing
- `npm test:sample` : run tests with sample data
- `npm run lint` : lint the project
- `npm run benchmark` : run all benchmarking
- `npm run benchmark:source` : run benchmarking for `source` (i.e. `ncbi`, `chebi`)
- `npm run clear` : clear all data
- `npm run clear:source` : clear data for `source` (i.e. `ncbi`, `chebi`)
- `npm run update` : update all data (download then index)
- `npm run update:source` : update data for `source` (i.e. `ncbi`, `chebi`) in elasticsearch
- `npm run download` : download all data
- `npm run download:source` download data for `source` (i.e. `ncbi`, `chebi`)
- `npm run index` : index all data
- `npm run index:source` : index data for `source` (i.e. `ncbi`, `chebi`) in elasticsearch
- `npm run test:inputgen` : generate input test file for each `source` (i.e. `uniprot`, ...)
- `npm run test:inputgen` : generate input test file for `source` (i.e. `uniprot`, ...)

## Running via Docker

Build the container.  Here, `grounding-search` is used as the container name.

```
cd grounding-search
docker build -t grounding-search .
```

Run the container:

```
docker run -it -p 12345:3000 -u "node" -e "NODE_ENV=production" --name "grounding-search" grounding-search
```

Notes:

- The `-it` switches are necessary to make `node` respond to `ctrl+c` etc. in `docker`.
- The `-p` switch indicates that port 3000 on the container is mapped to port 12345 on the host.  Without this switch, the server is inaccessible.
- The `-u` switch is used so that a non-root user is used inside the container.
- The `-e` switch is used to set environment variables.  Alternatively use `--env-file` to use a file with the environment variables.
- References:
  - [Dockerizing a Node.js web app](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
  - [Documentation of docker-node](https://github.com/nodejs/docker-node)
  - [Docker CLI docs](https://docs.docker.com/engine/reference/commandline/cli/)



## Testing

All files `/test` will be run by [Mocha](https://mochajs.org/).  You can `npm test` to run all tests, or you can run `npm test -- -g specific-test-name` to run specific tests.

[Chai](http://chaijs.com/) is included to make the tests easier to read and write.



## Publishing a release

1. Make sure the tests are passing: `npm test`
1. Make sure the linting is passing: `npm run lint`
1. Bump the version number with `npm version`, in accordance with [semver](http://semver.org/).  The `version` command in `npm` updates both `package.json` and git tags, but note that it uses a `v` prefix on the tags (e.g. `v1.2.3`).
  1. For a bug fix / patch release, run `npm version patch`.
  1. For a new feature release, run `npm version minor`.
  1. For a breaking API change, run `npm version major.`
  1. For a specific version number (e.g. 1.2.3), run `npm version 1.2.3`.
1. Push the release: `git push && git push --tags`
