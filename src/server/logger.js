import winston from 'winston';
import { LOG_LEVEL } from './config';

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: LOG_LEVEL }),
    new (winston.transports.File)({ name: 'out', filename: 'out.log', level: LOG_LEVEL })
  ]
});

logger.cli();

export default logger;
