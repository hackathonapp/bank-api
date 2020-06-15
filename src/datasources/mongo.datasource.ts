import {
  inject,
  lifeCycleObserver,
  LifeCycleObserver,
  ValueOrPromise,
} from '@loopback/core';
import {AnyObject, juggler} from '@loopback/repository';
import config from './mongo.datasource.config.json';

function updateConfig(dsConfig: AnyObject) {
  if (process.env.CLOUDFIVE_APP_MONGO_SERVICE_HOST) {
    dsConfig.host = process.env.CLOUDFIVE_APP_MONGO_SERVICE_HOST;
    dsConfig.user = process.env.CLOUDFIVE_APP_MONGO_SERVICE_USER;
    dsConfig.password = process.env.CLOUDFIVE_APP_MONGO_SERVICE_PASSWORD;
    dsConfig.database = process.env.CLOUDFIVE_APP_MONGO_SERVICE_DATABASE;
  }
  return dsConfig;
}

@lifeCycleObserver('datasource')
export class MongoDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'Mongo';

  constructor(
    @inject('datasources.config.Mongo', {optional: true})
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
