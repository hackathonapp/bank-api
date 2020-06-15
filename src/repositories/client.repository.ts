import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  repository,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Client, Kyc} from '../models';
import {KycRepository} from './kyc.repository';

export class ClientRepository extends DefaultCrudRepository<
  Client,
  typeof Client.prototype.clientId
> {
  public readonly kyc: HasManyRepositoryFactory<
    Kyc,
    typeof Client.prototype.clientId
  >;

  constructor(
    @inject('datasources.Mongo') dataSource: MongoDataSource,
    @repository.getter('KycRepository')
    protected kycRepositoryGetter: Getter<KycRepository>,
  ) {
    super(Client, dataSource);
    this.kyc = this.createHasManyRepositoryFactoryFor(
      'kyc',
      kycRepositoryGetter,
    );
    this.registerInclusionResolver('kyc', this.kyc.inclusionResolver);
  }
}
