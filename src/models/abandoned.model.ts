import {Entity, model, property} from '@loopback/repository';

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
export class Abandoned extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    mongodb: {dataType: 'ObjectId'},
  })
  id?: string;

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
  })
  emailAddress: string;

  @property({
    type: 'string',
    required: true,
  })
  mobileNumber: string;

  @property({
    type: 'string',
    // required: true,
  })
  telephoneNumber: string;

  @property({
    type: 'string',
    // required: true,
  })
  gender: string;

  @property({
    type: 'string',
    // required: true,
  })
  civilStatus: string;

  @property({
    type: 'string',
    // required: true,
  })
  birthdate: string;

  @property({
    type: 'string',
    // required: true,
  })
  birthplace: string;

  @property({
    type: 'string',
    // required: true,
  })
  nationality: string;

  @property({
    type: 'string',
    // required: true,
  })
  address1: string;

  @property({
    type: 'string',
    // required: true,
  })
  address2: string;

  @property({
    type: 'string',
    // required: true,
  })
  region: string;

  @property({
    type: 'string',
    // required: true,
  })
  province: string;

  @property({
    type: 'string',
    // required: true,
  })
  city: string;

  @property({
    type: 'string',
    // required: true,
  })
  zipcode: string;

  @property({
    type: 'string',
    // required: true,
  })
  incomeType: string;

  @property({
    type: 'string',
    // required: true,
  })
  tin: string;

  @property({
    type: 'string',
    // required: true,
  })
  employerBusiness: string;

  @property({
    type: 'string',
    // required: true,
  })
  workBusinessNature: string;

  @property({
    type: 'string',
    // required: true,
  })
  occupation: string;

  @property({
    type: 'string',
    // required: true,
  })
  monthlyIncome: string;

  constructor(data?: Partial<Abandoned>) {
    super(data);
  }
}

export interface AbandonedRelations {
  // describe navigational properties here
}

export type AbandonedWithRelations = Abandoned & AbandonedRelations;
