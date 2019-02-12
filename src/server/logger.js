let winston = require('winston');
let config = require('./config');

let logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ level: config.LOG_LEVEL }),
    new (winston.transports.File)({ name: 'out', filename: 'out.log', level: config.LOG_LEVEL })
  ]
});

logger.cli();

module.exports = logger;
