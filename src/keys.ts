// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {TokenService, UserService} from '@loopback/authentication';
import {BindingKey} from '@loopback/context';
import {Client} from './models';
import {Credentials} from './repositories';
import {PasswordHasher} from './services/hash.password.bcryptjs';
import {LoggerService} from './services/winston-logger';

export namespace TokenServiceConstants {
  export const TOKEN_SECRET_VALUE = 'myjwts3cr3t';
  export const TOKEN_EXPIRES_IN_VALUE = '600';
}

export namespace TokenServiceBindings {
  export const TOKEN_SECRET = BindingKey.create<string>(
    'authentication.jwt.secret',
  );
  export const TOKEN_EXPIRES_IN = BindingKey.create<string>(
    'authentication.jwt.expires.in.seconds',
  );
  export const TOKEN_SERVICE = BindingKey.create<TokenService>(
    'services.authentication.jwt.tokenservice',
  );
}

export namespace PasswordHasherBindings {
  export const PASSWORD_HASHER = BindingKey.create<PasswordHasher>(
    'services.hasher',
  );
  export const ROUNDS = BindingKey.create<number>('services.hasher.round');
}

export namespace ClientServiceBindings {
  export const CLIENT_SERVICE = BindingKey.create<
    UserService<Client, Credentials>
  >('services.user.service');
}

export namespace LoggerBindings {
  export const LOGGER = BindingKey.create<LoggerService>('services.logger');
}
