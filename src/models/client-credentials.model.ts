import {Entity, model, property} from '@loopback/repository';

@model()
export class ClientCredentials extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectID'},
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @property({
    type: 'string',
    required: true,
    mongodb: {dataType: 'ObjectID'},
  })
  clientId: string;

  constructor(data?: Partial<ClientCredentials>) {
    super(data);
  }
}

export interface ClientCredentialsRelations {
  // describe navigational properties here
}

export type ClientCredentialsWithRelations = ClientCredentials &
  ClientCredentialsRelations;
