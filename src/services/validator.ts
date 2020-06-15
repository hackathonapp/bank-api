import {HttpErrors} from '@loopback/rest';
import isemail from 'isemail';
// import {OnboardingClient} from '../types';

export type OnboardingClient = {
  emailAddress: string;
  mobileNumber: string;
};

export function validateClientInput(credentials: OnboardingClient) {
  // Validate Philippine mobile number format
  const rgxMobile = /^639\d{9}$/;
  if (!rgxMobile.test(credentials.mobileNumber)) {
    throw new HttpErrors.UnprocessableEntity(`Invalid mobileNumber format`);
  }

  // Validate email address
  if (!isemail.validate(credentials.emailAddress)) {
    throw new HttpErrors.UnprocessableEntity(`Invalid emailAddress format`);
  }
}
