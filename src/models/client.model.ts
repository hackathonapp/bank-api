import {Entity, hasMany, model, property} from '@loopback/repository';
import {Kyc} from './kyc.model';

@model({
  settings: {
    indexes: {
      uniqueEmail: {
        keys: {
          emailAddress: 1,
        },
        options: {
          unique: true,
        },
      },
    },
  },
})
export class Client extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  clientId: string;

  @property({
    type: 'string',
    required: true,
  })
  firstName: string;

  @property({
    type: 'string',
    required: true,
  })
  lastName: string;

  @property({
    type: 'string',
  })
  middleName?: string;

  @property({
    type: 'string',
  })
  suffixName?: string;

  @property({
    type: 'string',
    required: true,
    // index: {unique: true},
  })
  emailAddress: string;

  @property({
    type: 'string',
    required: true,
  })
  mobileNumber: string;

  @hasMany(() => Kyc)
  kyc: Kyc[];

  constructor(data?: Partial<Client>) {
    super(data);
  }
}

// export interface ClientRelations {
//   // describe navigational properties here
// }

// export type ClientWithRelations = Client & ClientRelations;
