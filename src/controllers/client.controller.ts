import {authenticate, TokenService} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
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
import _ from 'lodash';
import {PasswordHasherBindings, TokenServiceBindings} from '../keys';
import {Client} from '../models';
import {ClientRepository, KycRepository} from '../repositories';
import {PasswordHasher} from '../services/hash.password.bcryptjs';
import {validateClientInput} from '../services/validator';

export class ClientController {
  constructor(
    @repository(ClientRepository)
    public clientRepository: ClientRepository,
    @repository(KycRepository) protected kycRepository: KycRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
  ) {}

  @post('/clients', {
    // security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client model instance',
        content: {'application/json': {schema: getModelSchemaRef(Client)}},
      },
    },
  })
  // @authenticate('jwt')
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
    client: Omit<Client, 'clientId'>,
  ): Promise<Client> {
    validateClientInput(_.pick(client, ['emailAddress', 'mobileNumber']));
    try {
      const savedClient = await this.clientRepository.create(client);

      return savedClient;
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
    validateClientInput(_.pick(client, ['emailAddress', 'mobileNumber']));
    return this.clientRepository.updateAll(client, where);
  }

  @get('/clients/{email}', {
    // security: [{jwt: []}],
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
  // @authenticate('jwt')
  async findByEmail(
    @param.path.string('email') email: string,
  ): Promise<Client[]> {
    let filter: Filter = {where: {emailAddress: email}};
    return this.clientRepository.find(filter);
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
    await this.clientRepository.kyc(id).delete();
    await this.clientRepository.deleteById(id);
  }

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
    await this.kycRepository.deleteAll();
    await this.clientRepository.deleteAll();
  }
}
