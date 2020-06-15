import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import {AnyObject, juggler} from '@loopback/repository';
import config from './redis.datasource.config.json';

function updateConfig(dsConfig: AnyObject) {
  if (process.env.CLOUDFIVE_APP_REDIS_SERVICE_HOST) {
    dsConfig.host = process.env.CLOUDFIVE_APP_REDIS_SERVICE_HOST;
    dsConfig.port = +process.env.CLOUDFIVE_APP_REDIS_SERVICE_PORT!;
    dsConfig.password = process.env.CLOUDFIVE_APP_REDIS_SERVICE_PASSWORD;
  }
  return dsConfig;
}

@lifeCycleObserver('datasource')
export class RedisDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'Redis';

  constructor(
    @inject('datasources.config.Redis', {optional: true})
    dsConfig: object = config,
  ) {
    super(updateConfig(dsConfig));
  }

  /**
   * Start the datasource when application is started
   */
  start(): ValueOrPromise<void> {
    // Add your logic here to be invoked when the application is started
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop(): ValueOrPromise<void> {
    return super.disconnect();
  }
}
