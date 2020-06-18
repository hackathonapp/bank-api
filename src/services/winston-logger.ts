import winston from 'winston';

export interface LoggerService {
  logger: any;
}

export class WinstonLoggerService implements LoggerService {
  logger: winston.Logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(info => {
            return `[${info.timestamp}][${process.pid}][${process.env.OCP_POD_NAME}][${process.env.OCP_POD_IP}] ${info.level}: ${info.message}`;
          }),
        ),
      }),
    ],
  });
}
