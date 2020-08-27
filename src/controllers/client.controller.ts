import {
  authenticate,
  TokenService,
  UserService,
} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  AnyObject,
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  model,
  property,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  patch,
  post,
  put,
  requestBody,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import sendgrid from '@sendgrid/mail';
import _ from 'lodash';
import {
  ClientServiceBindings,
  LoggerBindings,
  PasswordHasherBindings,
  TokenServiceBindings,
} from '../keys';
import {Client} from '../models';
import {
  ClientCredentialsRepository,
  ClientRepository,
  KycRepository,
  SignatureRepository,
} from '../repositories';
import {Credentials} from '../repositories/client.repository';
import {PasswordHasher} from '../services/hash.password.bcryptjs';
import {LoggerService} from '../services/logdna-service';
import {validateClientInput} from '../services/validator';
import {CredentialsRequestBody} from './specs/client-login.specs';

@model()
export class NewClientRequest extends Client {
  @property({
    type: 'string',
    required: true,
  })
  password: string;
}

function generatePassword(length: number = 16) {
  var charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=',
    retVal = '';
  for (var i = 0, n = charset.length; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * n));
  }
  return retVal;
}

export class ClientController {
  constructor(
    @repository(ClientRepository)
    public clientRepository: ClientRepository,
    @repository(KycRepository) protected kycRepository: KycRepository,
    @repository(ClientCredentialsRepository)
    protected credentialsRepository: ClientCredentialsRepository,
    @repository(SignatureRepository)
    protected signatureRepository: SignatureRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(ClientServiceBindings.CLIENT_SERVICE)
    public clientService: UserService<Client, Credentials>,
    @inject(LoggerBindings.LOGGER) public logger: LoggerService,
  ) {}

  @post('/clients', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client model instance',
        content: {'application/json': {schema: getModelSchemaRef(Client)}},
      },
    },
  })
  @authenticate('jwt')
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Client, {
            title: 'NewClient',
            exclude: ['clientId'],
          }),
        },
      },
    })
    newClientRequest: Omit<NewClientRequest, 'clientId'>,
  ): Promise<AnyObject> {
    this.logger.logger.info('POST /clients');
    this.logger.logger.debug('Request Body: ', newClientRequest);
    this.logger.logger.debug('Validating email and mobile number format');
    validateClientInput(
      _.pick(newClientRequest, ['emailAddress', 'mobileNumber']),
    );
    this.logger.logger.debug('Validated!');

    // const crypto = require('crypto');
    // const token = crypto.randomBytes(8);
    // const tempPasssword = token.toString('hex');
    this.logger.logger.debug('Generating temporary password');
    const tempPassword = generatePassword();
    const password = await this.passwordHasher.hashPassword(tempPassword);

    try {
      this.logger.logger.debug('Saving new client to database');
      const savedClient = await this.clientRepository.create(
        _.omit(newClientRequest, 'password'),
      );

      await this.clientRepository
        .clientCredentials(savedClient.clientId)
        .create({password});

      this.logger.logger.debug('Sending welcome email');
      let sgKey: string = process.env.CLOUDFIVE_APP_SENDGRID_API_KEY || '';
      let sgFrom: string = process.env.CLOUDFIVE_APP_SENDGRID_SENDER || '';
      sendgrid.setApiKey(sgKey);
      const msg = {
        to: newClientRequest.emailAddress,
        from: sgFrom,
        subject: 'Welcome to CloudFive Bank Hackathon App',
        text: `Hello ${newClientRequest.firstName}, you may know access your account,
          please use your email address as your username, ${tempPassword} is your temporary password.`,
        html: `<div>Hello <strong>${newClientRequest.firstName},</strong>
          <p>Thank you for chosing us!</p>
          <p>Your application has been pre-approved</p>
          <p>Start using your account now and enjoy banking anytime, anywhere!<p>
          <p>Please use your email address as your username.<br/>
          Your temporary password is <code>${tempPassword}</code></p>
          <p>&nbsp;</p>
          <p>Best regards,<br/><strong>The CloudFive Team</strong></p></div>`,
      };
      sendgrid.send(msg);

      const ret: object = {password: tempPassword};
      const obj = Object.assign(ret, savedClient);

      return obj;
    } catch (error) {
      // MongoError 11000 duplicate key
      if (error.code === 11000 && error.errmsg.includes('index: uniqueEmail')) {
        throw new HttpErrors.Conflict('emailAddress value is already taken');
      } else {
        throw error;
      }
    }
  }

  @get('/clients/count', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async count(@param.where(Client) where?: Where<Client>): Promise<Count> {
    this.logger.logger.info('GET /clients/count');
    return this.clientRepository.count(where);
  }

  @get('/clients', {
    // security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Array of Client model instances',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Client, {includeRelations: false}),
            },
          },
        },
      },
    },
  })
  // @authenticate('jwt')
  async find(@param.filter(Client) filter?: Filter<Client>): Promise<Client[]> {
    this.logger.logger.info('GET /clients');
    return this.clientRepository.find(filter);
  }

  @patch('/clients', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Client, {exclude: ['clientId']}),
        },
      },
    })
    client: Omit<Client, 'clientId'>,
    @param.where(Client) where?: Where<Client>,
  ): Promise<Count> {
    this.logger.logger.info('PATCH /clients');
    validateClientInput(_.pick(client, ['emailAddress', 'mobileNumber']));
    return this.clientRepository.updateAll(client, where);
  }

  @get('/clients/{email}', {
    // security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Email address exists',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                found: {type: 'boolean'},
              },
            },
          },
        },
      },
    },
  })
  // @authenticate('jwt')
  async findByEmail(
    @param.path.string('email') email: string,
  ): Promise<{found: boolean}> {
    this.logger.logger.info(`GET /clients/${email}`);
    let filter: Filter = {where: {emailAddress: email}};
    let found = await this.clientRepository.find(filter);
    if (found.length >= 1) {
      this.logger.logger.debug('Email exists', found);
      return {found: true};
    }
    this.logger.logger.debug('Email not found');
    return {found: false};
  }

  @get('/clients/{id}', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Client, {
              includeRelations: false,
              exclude: ['kyc'],
            }),
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Client, {exclude: 'where'})
    filter?: FilterExcludingWhere<Client>,
  ): Promise<Client> {
    this.logger.logger.info(`GET /clients/${id}`);
    return this.clientRepository.findById(id, filter);
  }

  @patch('/clients/{id}', {
    security: [{jwt: []}],
    responses: {
      '204': {
        description: 'Client PATCH success',
      },
    },
  })
  @authenticate('jwt')
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Client, {exclude: ['clientId']}),
        },
      },
    })
    client: Omit<Client, 'clientId'>,
  ): Promise<void> {
    this.logger.logger.info(`PATCH /clients/${id}`);
    validateClientInput(_.pick(client, ['emailAddress', 'mobileNumber']));
    await this.clientRepository.updateById(id, client);
  }

  @put('/clients/{id}', {
    security: [{jwt: []}],
    responses: {
      '204': {
        description: 'Client PUT success',
      },
    },
  })
  @authenticate('jwt')
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Client, {exclude: ['clientId']}),
        },
      },
    })
    client: Omit<Client, 'clientId'>,
  ): Promise<void> {
    this.logger.logger.debug(`PUT /clients/${id}`);
    validateClientInput(_.pick(client, ['emailAddress', 'mobileNumber']));
    await this.clientRepository.replaceById(id, client);
  }

  @del('/clients/{id}', {
    security: [{jwt: []}],
    responses: {
      '204': {
        description: 'Client DELETE success',
      },
    },
  })
  @authenticate('jwt')
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    this.logger.logger.info(`DELETE /clients/${id}`);
    await this.clientRepository.kyc(id).delete();
    await this.clientRepository.clientCredentials(id).delete();
    await this.clientRepository.signature(id).delete();
    await this.clientRepository.deleteById(id);
  }
  // remove this api in production
  @del('/clients/all', {
    // security: [{jwt: []}],
    responses: {
      '204': {
        description: 'Client DELETE success',
      },
    },
  })
  // @authenticate('jwt')
  async deleteAll(): Promise<void> {
    this.logger.logger.info('DELETE /clients/all');
    await this.kycRepository.deleteAll();
    await this.credentialsRepository.deleteAll();
    await this.signatureRepository.deleteAll();
    await this.clientRepository.deleteAll();
  }

  @post('/clients/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
    this.logger.logger.info('POST /clients/login');
    // ensure the user exists, and the password is correct
    const user = await this.clientService.verifyCredentials(credentials);

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.clientService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);

    return {token};
  }

  @get('/clients/me', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client model instance',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Client, {
              includeRelations: false,
              exclude: ['kyc'],
            }),
          },
        },
      },
    },
  })
  @authenticate('jwt')
  async myProfile(
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<Client> {
    this.logger.logger.info(`GET /clients/me`);
    const userId = currentUserProfile[securityId];
    return this.clientRepository.findById(userId);
  }
}
