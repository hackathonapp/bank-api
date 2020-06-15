import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Client} from './client.model';

@model()
export class Kyc extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  kycId?: string;

  @belongsTo(() => Client, {}, {mongodb: {dataType: 'ObjectId'}})
  clientId?: string;

  @property({
    type: 'string',
    required: true,
  })
  kycType: string;

  @property({
    type: 'string',
    required: true,
  })
  kycRef: string;

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

  constructor(data?: Partial<Kyc>) {
    super(data);
  }
}

// export interface KycRelations {
//   // describe navigational properties here
// }

// export type KycWithRelations = Kyc & KycRelations;
