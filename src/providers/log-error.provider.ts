import {Provider} from '@loopback/context';
import {inject} from '@loopback/core';
import {LogError, Request} from '@loopback/rest';
import {LoggerBindings} from '../keys';
import {LoggerService} from '../services/logdna-service';

export class LogErrorProvider implements Provider<LogError> {
  constructor(@inject(LoggerBindings.LOGGER) protected logger: LoggerService) {}

  value(): LogError {
    return (err, statusCode, req) => this.action(err, statusCode, req);
  }

  action(err: Error, statusCode: number, req: Request) {
    // if (statusCode < 500) {
    //   return;
    // }

    this.logger.logger.error(
      `HTTP ${statusCode} on ${req.method} ${req.url}: ${err.stack ?? err}`,
    );
  }
}
