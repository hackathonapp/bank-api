import winston from 'winston';

export interface LoggerService {
  logger: any;
}

const logdnaWinston = require('logdna-winston');

const APIKEY = process.env.CLOUDFIVE_APP_LOGDNA_INGESTION_KEY;
const OCP_POD_NAMESPACE = process.env.OCP_POD_NAMESPACE;
const OCP_POD_NAME = process.env.OCP_POD_NAME;
const OCP_POD_IP = process.env.OCP_POD_IP;
const LOGLEVEL = process.env.CLOUDFIVE_APP_LOGLEVEL;

export class LogDnaLoggerService implements LoggerService {
  logger: winston.Logger = winston
    .createLogger({
      level: LOGLEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(info => {
              let m = JSON.stringify(info.message);
              return `${info.timestamp} [${OCP_POD_NAME}][${OCP_POD_NAME}][${OCP_POD_IP}] ${info.level} - ${m}`;
            }),
          ),
        }),
      ],
    })
    .add(
      new logdnaWinston({
        key: APIKEY,
        hostname: OCP_POD_NAMESPACE,
        ip: OCP_POD_IP,
        app: OCP_POD_NAME,
        level: LOGLEVEL,
        index_meta: true,
        handleExceptions: true,
      }),
    );
}
