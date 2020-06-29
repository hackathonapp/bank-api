import {UserService} from '@loopback/authentication';
import {inject} from '@loopback/context';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings} from '../keys';
import {Client} from '../models/client.model';
import {ClientRepository, Credentials} from '../repositories/client.repository';
import {PasswordHasher} from './hash.password.bcryptjs';

export class ClientService implements UserService<Client, Credentials> {
  constructor(
    @repository(ClientRepository) public clientRepository: ClientRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
  ) {}

  async verifyCredentials(credentials: Credentials): Promise<Client> {
    const invalidCredentialsError = 'Invalid email or password.';

    const foundClient = await this.clientRepository.findOne({
      where: {emailAddress: credentials.emailAddress},
    });
    if (!foundClient) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const credentialsFound: any = await this.clientRepository.findCredentials(
      foundClient.clientId,
    );
    if (!credentialsFound) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await this.passwordHasher.comparePassword(
      credentials.password,
      credentialsFound.password,
    );

    if (!passwordMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    return foundClient;
  }

  convertToUserProfile(client: Client): UserProfile {
    let userName = `${client.firstName} ${client.lastName}`;
    const userProfile = {
      [securityId]: client.clientId,
      name: userName,
      id: client.clientId,
      // roles: user.roles,
    };

    return userProfile;
  }
}
