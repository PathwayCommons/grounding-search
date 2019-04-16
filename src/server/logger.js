import winston from 'winston';
import { config } from './config';

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: config.LOG_LEVEL }),
    new (winston.transports.File)({ name: 'out', filename: 'out.log', level: config.LOG_LEVEL })
  ]
});

logger.cli();

export default logger;
