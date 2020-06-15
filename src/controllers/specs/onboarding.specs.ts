const OnboardingOTPSchema = {
  type: 'object',
  title: 'OnboardingOTPResponse',
  required: ['sid'],
  properties: {
    otp: {type: 'string'},
    sid: {type: 'string'},
  },
};

export const OnboardingOTPResponse = {
  description: 'Onboarding OTP',
  content: {
    'application/json': {schema: OnboardingOTPSchema},
  },
};

const OTPVerifyResponseSchema = {
  type: 'object',
  title: 'OTPVerifyResponse',
  required: ['valid'],
  properties: {
    valid: {type: 'boolean'},
  },
};

export const OTPVerifyResponse = {
  description: 'Onboarding OTP Verified',
  content: {
    'application/json': {schema: OTPVerifyResponseSchema},
  },
};

const OTPVerifyRequestSchema = {
  type: 'object',
  title: 'OTPVerifyRequest',
  required: ['token', 'otp'],
  properties: {
    token: {type: 'string'},
    otp: {type: 'string'},
  },
};

export const OTPVerifyRequest = {
  description: 'Onboarding OTP Verification parameters',
  content: {
    'application/json': {schema: OTPVerifyRequestSchema},
  },
};

const TokenSchema = {
  type: 'object',
  title: 'TokenResponse',
  required: ['token'],
  properties: {
    token: {type: 'string'},
  },
};

export const TokenResponse = {
  description: 'This is the response body for tokens',
  content: {
    'application/json': {schema: TokenSchema},
  },
};
