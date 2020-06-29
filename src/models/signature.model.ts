import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Client} from './client.model';

@model()
export class Signature extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  signatureId?: string;

  @belongsTo(() => Client, {}, {mongodb: {dataType: 'ObjectId'}})
  clientId?: string;

  @property({
    type: 'string',
    required: true,
  })
  objectName: string;

  @property({
    type: 'string',
    required: true,
  })
  objectLocation: string;

  constructor(data?: Partial<Signature>) {
    super(data);
  }
}

export interface SignatureRelations {
  // describe navigational properties here
}

export type SignatureWithRelations = Signature & SignatureRelations;
