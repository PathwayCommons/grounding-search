const cmd = require('node-cmd');
const fs = require('fs');
const util = require('util');

const { INPUT_PATH } = require('../config');
const logger = require('../logger');

const getCmd = util.promisify(cmd.get, { multiArgs: true, context: cmd });

function fetchFile( props ) {
  let { fileName, url, zipType } = props;

  let filePath = INPUT_PATH + '/' + fileName;
  let folderExist = fs.existsSync(INPUT_PATH);
  let fileExist = fs.existsSync(filePath);
  let dlPath = zipType ? filePath + '.' + zipType : filePath;

  const getUnzipStr = () => {
    let commandMap = {
      'gz': 'gunzip'
    };

    let command = zipType && commandMap[ zipType ];

    if ( command ) {
      return `${command} ${dlPath}`
    }

    return '';
  };

  if ( fileExist ) {
    logger.info('using the already existing data file...');
    return Promise.resolve();
  }

  logger.info('fetching data file...');
  return getCmd(
    `
      ${ !folderExist ? 'mkdir ' + FOLDER_PATH : '' }
      ${ fileExist ? 'rm ' + filePath : '' }
      curl -o ${ dlPath } ${ url }
      ${ getUnzipStr() }
    `
  );
}

module.exports = fetchFile;
