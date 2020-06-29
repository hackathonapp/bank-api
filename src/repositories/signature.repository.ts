import {DefaultCrudRepository} from '@loopback/repository';
import {Signature, SignatureRelations} from '../models';
import {MongoDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class SignatureRepository extends DefaultCrudRepository<
  Signature,
  typeof Signature.prototype.signatureId,
  SignatureRelations
> {
  constructor(
    @inject('datasources.Mongo') dataSource: MongoDataSource,
  ) {
    super(Signature, dataSource);
  }
}
