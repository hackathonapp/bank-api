import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Kyc} from '../models';

export class KycRepository extends DefaultCrudRepository<
  Kyc,
  typeof Kyc.prototype.kycId
> {
  constructor(@inject('datasources.Mongo') dataSource: MongoDataSource) {
    super(Kyc, dataSource);
  }
}
