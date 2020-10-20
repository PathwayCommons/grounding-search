/** @module download */

import path from 'path';
import logger from '../logger';
import { INPUT_PATH } from '../config';
import httpDownload from 'download';
import ftp from 'ftp';
import { URL } from 'url';
import fs from 'fs';
import zlib from 'zlib';

const MIN_SIZE_MB = 0 * 1024 * 1024;
const checkFileSize = fileName => {
  const filePath = path.join( INPUT_PATH, fileName );
  const stats = fs.statSync( filePath );
  if( stats.size <= MIN_SIZE_MB ) throw new Error( `Download file size less than MIN_SIZE` );
};

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
              client.destroy();
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

/**
 * Download a file to the input folder.
 * @param {string} url Url that hosts the file to download.
 * @param {string} outFileName Name of output file after the download.
 * @param {boolean} [forceIfFileExists=false] Whether to download output file and replace it if a file
 * with the same name already exists.
 * @returns {Promise}
 */
const dl = (url, outFileName, forceIfFileExists = false) => {
  const parsedUrl = new URL(url);

  if( !forceIfFileExists && fs.existsSync(path.join(INPUT_PATH, outFileName)) ){
    return;
  }

  logger.info(`Downloading ${url} to ${outFileName}`);

  if( parsedUrl.protocol === 'ftp:' ){
    await ftpDownload(url, outFileName);
  } else {
    await httpDownload(url, INPUT_PATH, { extract: true, filename: outFileName });
  }

  checkFileSize( outFileName );
};

export default dl;