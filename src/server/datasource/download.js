const path = require('path');
const logger = require('../logger');
const httpDownload = require('download');
const ftp = require('ftp');
const { URL } = require('url');
const fs = require('fs');
const zlib = require('zlib');

const { INPUT_PATH } = require('../config');

const ftpDownload = (url, outFileName) => {
  return Promise.resolve().then(() => {
    const parsedUrl = new URL(url);
    const client = new ftp();
    const outputFileStream = fs.createWriteStream(path.join(INPUT_PATH, outFileName));

    const getFtpStream = () => {
      return new Promise((resolve, reject) => {
        client.connect({ host: parsedUrl.host });

        client.on('ready', () => {
          client.get(parsedUrl.pathname, function(err, fileStream){
            if( err ){
              reject(err);
            } else {
              resolve(fileStream);
            }
          });
        });

        client.on('error', reject);
      });
    };

    const unzip = inputStream => {
      if( parsedUrl.pathname.match(/(zip|gz)$/) ){
        return inputStream.pipe(zlib.createUnzip());
      } else {
        return inputStream;
      }
    };

    const write = inputStream => new Promise((resolve, reject) => {
      inputStream.on('end', () => {
        client.end();

        resolve(outputFileStream);
      });
      inputStream.on('error', reject);

      inputStream.pipe(outputFileStream);
    });

    return getFtpStream().then(unzip).then(write);
  });
};

const dl = (url, outFileName, forceIfFileExists = false) => {
  const parsedUrl = new URL(url);

  if( !forceIfFileExists && fs.existsSync(path.join(INPUT_PATH, outFileName)) ){
    return Promise.resolve();
  }

  logger.info(`Downloading ${url} to ${outFileName}`);

  if( parsedUrl.protocol === 'ftp:' ){
    return ftpDownload(url, outFileName);
  } else {
    return httpDownload(url, INPUT_PATH, { extract: true, filename: outFileName });
  }
};

module.exports = dl;