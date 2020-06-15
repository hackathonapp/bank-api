import {Model, model, property} from '@loopback/repository';

@model()
export class Onboarding extends Model {
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
    required: false,
  })
  secret: string;

  constructor(data?: Partial<Onboarding>) {
    super(data);
  }
}

export interface OnboardingRelations {
  // describe navigational properties here
}

export type OnboardingWithRelations = Onboarding & OnboardingRelations;
