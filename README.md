# grounding-search

[![DOI](https://zenodo.org/badge/170363308.svg)](https://zenodo.org/badge/latestdoi/170363308)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/PathwayCommons/grounding-search/blob/master/LICENSE)
[![Build Status](https://travis-ci.org/PathwayCommons/grounding-search.svg?branch=master)](https://travis-ci.org/PathwayCommons/grounding-search)

## Description

The identification of sub-cellular biological entities is an important consideration in the use and creation of bioinformatics analysis tools and accessible biological research apps.  When research information is uniquely and unambiguously identified, it enables data to be accurately retrieved, cross-referenced, and integrated.  In practice, biological entities are “identified” when they are associated with a matching record from a knowledge base that specialises in collecting and organising information of that type (e.g. gene sequences).  Our search service increases the efficiency and ease of use for identifying biological entities.  This identification may be used to power research apps and tools where colloquial entity names may be provided as input.

## Required software

- [Node.js](https://nodejs.org/en/) >=8
- [Elasticsearch](https://www.elastic.co/products/elasticsearch) >=6.6.0, <7

## Quick start

### Run with Docker

Ensure that you have installed [Docker](https://docs.docker.com/) (>=20.10.0) and [Docker Compose](https://docs.docker.com/compose/) (>=1.29.0).

Clone this remote or simply download the `docker-compose.yml` file then run the following:

```
docker-compose up --detach
```

- Notes
  - Swagger documentation can be accessed at [`http://localhost:3000`](http://localhost:3000) once the service is running locally.
  - It will take some time, depending on your system and internet connection, for the grounding-search server to start since the Elasticsearch container must initialize and the index data must be restored.
  - Check the initialization progress by viewing the logs with `docker-compose logs -ft`


### Run from source

With Node and Elasticsearch installed with default options, run the following in a cloned copy of the repository:

- `npm install`: Install npm dependencies
- `npm run update`: Download and index the data
- `npm start`: Start the server (by default on port 3000)

## Service usage

Refer to our [Swagger documentation](https://grounding.baderlab.org) in order to form a query to the service.

## Issues & feedback

To let us know about an issue in the software or to provide feedback, please [file an issue on GitHub](https://github.com/PathwayCommons/grounding-search/issues/new).

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
- `NCBI_EUTILS_BASE_URL` : url for NCBI EUTILS
- `NCBI_EUTILS_API_KEY` : NCBI EUTILS API key
- `ESDUMP_LOCATION` : The location (URL, file path) of elasticdump files (note: terminate with '/')
- `ZENODO_API_URL`: base url for Zenodo
- `ZENODO_ACCESS_TOKEN`: access token for Zenodo REST API (Scope: `deposit:actions`, `deposit:write`)
- `ZENODO_BUCKET_ID`: id for Zenodo deposition 'bucket' (Files API)
- `ZENODO_DEPOSITION_ID`: id for Zenodo deposition (for a published dataset)

## Run targets

- `npm start` : start the server
- `npm stop` : stop the server
- `npm run watch` : watch mode (debug mode enabled, autoreload)
- `npm run refresh` : run clear, update, then start
- `npm test` : run tests for read only methods (e.g. search and get) assuming that data is already existing
- `npm test:sample` : run tests with sample data
- `npm run test:quality` : run the search quality tests (expects full db)
- `npm run test:quality:csv` : run the search quality tests and output a csv file
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
- `npm run dump` : dump the information for `INDEX` to `ESDUMP_LOCATION`
- `npm run restore` : restore the information for `INDEX` from `ESDUMP_LOCATION`
- `npm run boot` : run `clear`, `restore` then `start`; exit on errors

## Dump and restore

To export the Elasticsearch instance index information and upload to datastore ([Zenodo](https://zenodo.org/)):

```
npm run dump
```

To download information from datastore and import to an Elasticsearch instance:

```
npm run restore
```

To start the server after a successful restore in one command:

```
npm run boot
```

Notes:

- Related environment variables
  - `ZENODO_API_URL`: You can play around with this in their sandbox site (`https://sandbox.zenodo.org/`)
  - dump
    - `ZENODO_ACCESS_TOKEN` and `ZENODO_BUCKET_ID`: These should have been created beforehand under the user `biofactoid` linked to the email `info@biofactoid.org` and password same as for [MailJet](https://app.mailjet.com/)
  - restore
    - `ZENODO_DEPOSITION_ID`: This is for published datasets (i.e. index files) only
- References:
  - [Zenodo | Developers](https://developers.zenodo.org/#entities)
  - [npm package for elasticdump](https://www.npmjs.com/package/elasticdump)

## Zenodo setup

[Zenodo](https://zenodo.org/) lets you you to store and retrieve digital artefacts related to a scientific project or publication. Here, we use Zenodo to store Elasticsearch index information needed to recreate the index.

### Create and publish a new record deposition

Briefly, using their [RESTful web service API](https://developers.zenodo.org/), you can create a 'Deposition' for a record that has a 'bucket' referenced by a `ZENODO_BUCKET_ID` to which you can upload and download 'files' (i.e. `<ZENODO_API_URL>api/files/<ZENODO_BUCKET_ID>/<filename>`; list them with `https://zenodo.org/api/deposit/depositions/<deposition id>/files`). In particular, there are three files required to recreate an index, corresponding to the elasticsearch types: `data`; `mapping` and `analyzer`.

To setup follow these steps:

1. Get a `ZENODO_ACCESS_TOKEN` by creating a 'Personal access token' ([see docs for details](https://sandbox.zenodo.org/account/settings/applications/)). Be sure to add the `deposit:actions` and `deposit:write` scopes.
2. Create a recrod 'Deposition' by POSTing to `https://zenodo.org/api/deposit/depositions` with at least the following information, keeping in mind to set the header `Authorization = Bearer <ZENODO_ACCESS_TOKEN>`:
```json
{
	"metadata": {
		"title": "Elasticsearch data for biofactoid.org grounding-search service",
		"upload_type": "dataset",
		"description": "This deposition contains files with data describing an Elasticsearch index (https://github.com/PathwayCommons/grounding-search). The files were generated from the elasticdump npm package (https://www.npmjs.com/package/elasticdump). The data are the neccessary and sufficient information to populate an Elasticsearch index.",
		"creators": [
			{
				"name": "Biofactoid",
				"affiliation": "biofactoid.org"
			}
		],
		"access_right": "open",
		"license": "cc-zero"
	}
}
```
3. The POST response should have a 'bucket' (e.g. `"bucket": "https://zenodo.org/api/files/<uuid>"` ) within the `links` object. The variable `ZENODO_BUCKET_ID` is the value `<uuid>` in the example URL.
4. Publish. You'll want to dump the index and upload to Zenodo (`npm run dump`). You can publish this from the API by POSTing to `https://zenodo.org/api/deposit/depositions/<deposition id>/actions/publish`. Alternatively, log in to the Zenodo [web page](https://zenodo.org/deposit) and click 'Publish' to make the deposition public.

Once published, a deposition cannot be updated or altered. However, you can create a new version of a record (below).

### Create and publish a new version of a record

In this case, you already have a record which points to a published deposition (i.e. elasticsearch index files) and wish to create a new version for that record. Here, you'll create a new deposition under the same record:

1. Make a POST request to `https://zenodo.org/api/deposit/depositions/<deposition id>/actions/newversion` to create a new version. Alternatively, visit `https://zenodo.org/record/<deposition id>` where `deposition id` is that of the latest published version (default).
2. Fetch `https://zenodo.org/api/deposit/depositions?all_versions` to list all your depositions and identify the new deposition bucket id.
3. Proceed to upload (i.e. dump) your new files as described in "Create a new deposition", Step 3.

- Notes:
  - New version's files must differ from all previous versions
  - See https://help.zenodo.org/#versioning and https://developers.zenodo.org/#new-version for more info


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
1. [Publish a GitHub release](https://github.com/PathwayCommons/grounding-search/releases/new) so that Zenodo creates a DOI for this version.
