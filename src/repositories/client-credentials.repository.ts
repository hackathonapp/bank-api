import {DefaultCrudRepository} from '@loopback/repository';
import {ClientCredentials, ClientCredentialsRelations} from '../models';
import {MongoDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class ClientCredentialsRepository extends DefaultCrudRepository<
  ClientCredentials,
  typeof ClientCredentials.prototype.id,
  ClientCredentialsRelations
> {
  constructor(
    @inject('datasources.Mongo') dataSource: MongoDataSource,
  ) {
    super(ClientCredentials, dataSource);
  }
}
