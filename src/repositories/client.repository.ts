import {Getter, inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasOneRepositoryFactory,
  repository,
} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {Client, ClientCredentials, Kyc, Signature} from '../models';
import {ClientCredentialsRepository} from './client-credentials.repository';
import {KycRepository} from './kyc.repository';
import {SignatureRepository} from './signature.repository';

export type Credentials = {
  emailAddress: string;
  password: string;
};

export class ClientRepository extends DefaultCrudRepository<
  Client,
  typeof Client.prototype.clientId
> {
  public readonly kyc: HasManyRepositoryFactory<
    Kyc,
    typeof Client.prototype.clientId
  >;

  public readonly clientCredentials: HasOneRepositoryFactory<
    ClientCredentials,
    typeof Client.prototype.clientId
  >;

  public readonly signature: HasManyRepositoryFactory<
    Signature,
    typeof Client.prototype.clientId
  >;

  constructor(
    @inject('datasources.Mongo') dataSource: MongoDataSource,
    @repository.getter('KycRepository')
    protected kycRepositoryGetter: Getter<KycRepository>,
    @repository.getter('ClientCredentialsRepository')
    protected clientCredentialsRepositoryGetter: Getter<
      ClientCredentialsRepository
    >,
    @repository.getter('SignatureRepository')
    protected signatureRepositoryGetter: Getter<SignatureRepository>,
  ) {
    super(Client, dataSource);
    this.kyc = this.createHasManyRepositoryFactoryFor(
      'kyc',
      kycRepositoryGetter,
    );
    this.registerInclusionResolver('kyc', this.kyc.inclusionResolver);

    this.clientCredentials = this.createHasOneRepositoryFactoryFor(
      'clientCredentials',
      clientCredentialsRepositoryGetter,
    );
    this.registerInclusionResolver(
      'clientCredentials',
      this.clientCredentials.inclusionResolver,
    );

    this.signature = this.createHasManyRepositoryFactoryFor(
      'signature',
      signatureRepositoryGetter,
    );
    this.registerInclusionResolver(
      'signature',
      this.signature.inclusionResolver,
    );
  }

  async findCredentials(
    clientId: typeof Client.prototype.clientId,
  ): Promise<ClientCredentials | unknown> {
    try {
      return await this.clientCredentials(clientId).get();
    } catch (err) {
      if (err.code === 'ENTITY_NOT_FOUND') {
        return undefined;
      }
      throw err;
    }
  }
}
