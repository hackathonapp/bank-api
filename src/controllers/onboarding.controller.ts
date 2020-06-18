import {TokenService} from '@loopback/authentication';
import {inject, uuid} from '@loopback/context';
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  Request,
  requestBody,
  RestBindings,
} from '@loopback/rest';
import {securityId} from '@loopback/security';
import _ from 'lodash';
import {LoggerBindings, TokenServiceBindings} from '../keys';
import {Onboarding} from '../models';
import {OnboardingRepository} from '../repositories';
import {LoggerService} from '../services/logdna-service';
// import {Credentials} from '../repositories/onboarding.repository';
import {validateClientInput} from '../services/validator';
import {
  OnboardingOTPResponse,
  OTPVerifyRequest,
  OTPVerifyResponse,
  TokenResponse,
} from './specs/onboarding.specs';

export class OnboardingController {
  constructor(
    @inject(RestBindings.Http.REQUEST) private req: Request,
    @repository(OnboardingRepository)
    public onboardingRepository: OnboardingRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService, // @inject(UserServiceBindings.USER_SERVICE) // public userService: UserService<Onboarding, Credentials>,
    @inject(LoggerBindings.LOGGER) public logger: LoggerService,
  ) {}

  /**
   * Create onboarding customer information
   * @param onboarding Onboaring object
   */
  @post('/onboarding', {
    responses: {
      '200': TokenResponse,
    },
  })
  async onboarding(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Onboarding, {
            title: 'OnboardingResponse',
            exclude: ['secret'],
          }),
        },
      },
    })
    onboarding: Onboarding,
  ): Promise<Object> {
    this.logger.logger.info('POST /onboarding');
    this.logger.logger.debug(onboarding);
    validateClientInput(_.pick(onboarding, ['emailAddress', 'mobileNumber']));

    // Generate onboarding token
    const crypto = require('crypto');
    // TODO: Make crypto aynchronous
    const token = crypto.randomBytes(32);
    const key = token.toString('hex');

    // Save onboarding
    onboarding.mobileNumber = '+' + onboarding.mobileNumber; // +63 mobile number format
    await this.onboardingRepository.create(key, onboarding, 600000);

    // Reply with a greeting, the current time, the url, and request headers
    return {
      token: key,
    };
  }

  /**
   * Generate a One-Time Pin for a given token
   * @param token Onboaring token/id
   */
  @post('/onboarding/{token}/otp', {
    responses: {
      '200': OnboardingOTPResponse,
    },
  })
  async sendOtp(
    @param.path.string('token')
    token: string,
  ): Promise<Object> {
    console.log('POST /onboarding/{token}/otp');
    const onboarding = await this.onboardingRepository.get(token);
    console.log('Key: %s', token);
    console.log('Value: %o', onboarding);
    if (onboarding == null) {
      throw new HttpErrors.BadRequest(`Invalid token ${token}`);
    }

    // Generate secret and OTP
    const Speakeasy = require('speakeasy');
    const secret = await Speakeasy.generateSecret({length: 20});
    const otp = Speakeasy.totp({
      secret: secret.base32,
      encoding: 'base32',
      step: 300, // seconds
    });

    console.log(secret.base32);
    console.log(otp);
    console.log(token);

    // Save onboarding secret, use previous TTL
    // TODO: Use Redis KEEPTTL option
    onboarding.secret = secret.base32;
    const ttl = await this.onboardingRepository.ttl(token);
    if (ttl) {
      await this.onboardingRepository.create(token, onboarding, ttl);
    }

    // Send SMS OTP
    const accountSid = process.env.CLOUDFIVE_APP_TWILIO_ACCOUNT_SID;
    const authToken = process.env.CLOUDFIVE_APP_TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.CLOUDFIVE_APP_TWILIO_PHONE_NUMBER;
    const Twilio = require('twilio');
    const client = new Twilio(accountSid, authToken);
    let smsid = await client.messages
      .create({
        body:
          'Please enter your One-Time PIN (OTP) ' +
          otp +
          ' to proceed with your transaction.',
        to: onboarding.mobileNumber,
        from: twilioPhone,
      })
      .then((message: any) => {
        return message.sid;
      });

    return {
      otp: otp, // Remove this, OTP are not to be returned, for testing only
      sid: smsid,
    };
  }

  /**
   * Checks if the OTP is valid for a transaction
   * @param token Onboaring token/id
   * @param otp Time-based One-Time Pin
   */
  @post('/otp/verify', {
    responses: {
      '200': OTPVerifyResponse,
    },
  })
  async verifyOtp(
    @requestBody(OTPVerifyRequest)
    totp: {
      token: 'string';
      otp: 'string';
    },
  ): Promise<Object> {
    console.log('POST /otp/verify');
    const onboarding = await this.onboardingRepository.get(totp.token);
    console.log('Key: %s', totp.token);
    console.log('Value: %o', onboarding);
    if (onboarding == null) {
      throw new HttpErrors.NotFound(`Token not found - ${totp.token}`);
    }

    console.log(onboarding.secret);
    console.log(totp.otp);
    // Generate secret and OTP
    const Speakeasy = require('speakeasy');
    const otp = Speakeasy.totp.verify({
      secret: onboarding.secret,
      encoding: 'base32',
      token: totp.otp,
      step: 300,
      window: 0,
    });

    if (otp) {
      // create a JSON Web Token based on the user profile
      //const userProfile = this.userService.convertToUserProfile(onboarding);
      const userProfile = {
        [securityId]: onboarding.firstName,
        name: `${onboarding.firstName} ${onboarding.lastName}`,
        id: uuid,
      };

      const token = await this.jwtService.generateToken(userProfile);
      return {
        valid: otp,
        authToken: token,
      };
    }

    return {valid: false};
  }

  /**
   * Retrieve the onboarding customer information by its assigned token
   * @param token Onboaring token/id
   */
  @get('/onboarding/{token}', {
    responses: {
      '200': {
        description: 'Onboarding customer information',
        content: {
          'application/json': {
            schema: getModelSchemaRef(Onboarding, {
              title: 'OnboardingResponse',
              exclude: ['secret'],
            }),
          },
        },
      },
    },
  })
  async get(
    @param.path.string('token') token: string,
  ): Promise<Omit<Onboarding, 'secret'>> {
    console.log('GET /onboarding/{token}');
    const onboarding = await this.onboardingRepository.get(token);
    console.log('Key: %s', token);
    console.log('Value: %o', onboarding);
    if (onboarding == null) {
      throw new HttpErrors.NotFound(`Token not found - ${token}`);
    } else {
      delete onboarding.secret;
      return onboarding;
    }
  }
}
