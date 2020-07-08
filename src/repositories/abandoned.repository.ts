import {DefaultCrudRepository} from '@loopback/repository';
import {Abandoned, AbandonedRelations} from '../models';
import {MongoDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class AbandonedRepository extends DefaultCrudRepository<
  Abandoned,
  typeof Abandoned.prototype.id,
  AbandonedRelations
> {
  constructor(
    @inject('datasources.Mongo') dataSource: MongoDataSource,
  ) {
    super(Abandoned, dataSource);
  }
}
