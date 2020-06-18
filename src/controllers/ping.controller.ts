import {inject} from '@loopback/context';
import {get, Request, ResponseObject, RestBindings} from '@loopback/rest';
import {LoggerBindings} from '../keys';
// import {LoggerService} from '../services/winston-logger';
import {LoggerService} from '../services/logdna-service';

/**
 * OpenAPI response for ping()
 */
const PING_RESPONSE: ResponseObject = {
  description: 'Ping Response',
  content: {
    'application/json': {
      schema: {
        type: 'object',
        title: 'PingResponse',
        properties: {
          greeting: {type: 'string'},
          date: {type: 'string'},
          url: {type: 'string'},
          headers: {
            type: 'object',
            properties: {
              'Content-Type': {type: 'string'},
            },
            additionalProperties: true,
          },
        },
      },
    },
  },
};

/**
 * A simple controller to bounce back http requests
 */
export class PingController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    // @inject(LoggerBindings.LOGGER) public winston: LoggerService,
    @inject(LoggerBindings.LOGGER) public logger: LoggerService,
  ) {}

  // Map to `GET /ping`
  @get('/ping', {
    responses: {
      '200': PING_RESPONSE,
    },
  })
  ping(): object {
    this.logger.logger.info('GET /ping - Hello from LoopBack');
    // Reply with a greeting, the current time, the url, and request headers
    return {
      greeting: 'Hello from LoopBack',
      date: new Date(),
      url: this.req.url,
      headers: Object.assign({}, this.req.headers),
    };
  }
}
