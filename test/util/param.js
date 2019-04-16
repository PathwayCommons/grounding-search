const forceDownload = false;
const maxSearchSize = 10000;
const buildIndex = process.env.TESTS_BUILD_INDEX === 'true'
  || process.env.TESTS_BUILD_INDEX === 'TRUE';

export { forceDownload, maxSearchSize, buildIndex };
