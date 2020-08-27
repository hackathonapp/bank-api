import {authenticate, TokenService} from '@loopback/authentication';
import {inject} from '@loopback/context';
import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  getWhereSchemaFor,
  HttpErrors,
  param,
  patch,
  post,
  Request,
  requestBody,
  Response,
  RestBindings,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import AWS from 'aws-sdk';
import fd from 'form-data';
import moment from 'moment';
// import _ from 'lodash';
import multer from 'multer';
import path from 'path';
import stream from 'stream';
import {LoggerBindings, TokenServiceBindings} from '../keys';
import {Client, Kyc, Signature} from '../models';
import {ClientRepository, OnboardingRepository} from '../repositories';
import {generateSignedUrl} from '../services/ibmcos';
import {LoggerService} from '../services/logdna-service';

const {Duplex} = stream;
const config = {
  region: process.env.CLOUDFIVE_APP_IBMCOS_S3_REGION,
  accessKeyId: process.env.CLOUDFIVE_APP_IBMCOS_S3_ACCESSKEY,
  secretAccessKey: process.env.CLOUDFIVE_APP_IBMCOS_S3_SECRET,
  endpoint: process.env.CLOUDFIVE_APP_IBMCOS_S3_ENDPOINT,
};
const s3 = new AWS.S3(config);

function bufferToStream(buffer: Buffer) {
  const duplexStream = new Duplex();
  duplexStream.push(buffer);
  duplexStream.push(null);
  return duplexStream;
}

/**
 * A controller to handle file uploads using multipart/form-data media type
 */
export class KycController {
  /**
   * Constructor
   * @param handler - Inject an express request handler to deal with the request
   */
  constructor(
    @repository(OnboardingRepository)
    public onboardingRepository: OnboardingRepository,
    @repository(ClientRepository) protected clientRepository: ClientRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(LoggerBindings.LOGGER) public logger: LoggerService,
  ) {}

  // @post('/onboarding/{token}/kyc', {
  @post('/kyc/upload', {
    security: [{jwt: []}],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
            },
          },
        },
        description: 'Files and fields',
      },
    },
  })
  @authenticate('jwt')
  async kycUpload(
    // @param.path.string('token') token: string,
    @requestBody.file()
    request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
    @inject(SecurityBindings.USER)
    currentUserProfile: UserProfile,
  ): Promise<object> {
    this.logger.logger.info('POST /kyc/upload');
    console.log(currentUserProfile.name);

    const token: any = currentUserProfile.name;
    const onboarding = await this.onboardingRepository.get(token);
    const date = new Date(onboarding.birthdate);
    const subjBday = moment(date.toISOString()).format('DD/MM/YYYY');
    const subjName = `${onboarding.lastName}, ${onboarding.firstName}`;
    const subjTin = onboarding.tin;

    return new Promise<object>((resolve, reject) => {
      const storage = multer.memoryStorage();
      const upload = multer({
        storage: storage,
        limits: {
          fileSize: 1000000, // 10MB, in bytes
          files: 5, // max 5 files per upload
        },
        fileFilter: function (req, file, cb) {
          const filetypes = /jpeg|jpg|png/;
          let mimetype = filetypes.test(file.mimetype);
          let extname = filetypes.test(
            path.extname(file.originalname).toLowerCase(),
          );

          if (mimetype && extname) {
            return cb(null, true);
          }

          cb(
            new HttpErrors.UnprocessableEntity(
              'File not accepted, invalid mimetype',
            ),
          );
        },
      });

      upload.any()(request, response, async (err: any) => {
        if (err) reject(new HttpErrors.UnprocessableEntity(err.message));
        else {
          let res = new Array();
          for (const file of (request as any).files) {
            let formData = new fd();
            formData.append('image', file.buffer, {
              filename: file.originalname,
            });

            this.logger.logger.debug('Sending file to OCR prediction model');
            const axios = require('axios');
            const ocrurl =
              (process.env.CLOUDFIVE_APP_MAXOCR_ENDPOINT ||
                'http://localhost:5000') + '/model/predict';

            const KYC_OCR_REGEX = {
              bir: /BUREAU OF INTERNAL REVENUE/,
              tin: /TIN:/,
              dob: /^DATE.+BIRTH/,
              issued: /^DATE.+ISSUE/,
            };
            const tinDetails = {
              type: '',
              name: '',
              ref: '',
              address: '',
              dob: '',
              issued: '',
            };
            const _this = this;
            await axios
              .create({
                headers: formData.getHeaders(),
              })
              .post(ocrurl, formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
                timeout: +process.env.CLOUDFIVE_APP_MAXOCR_TIMEOUT! || 10000,
              })
              .then((response: any) => {
                if (response.data.status == 'ok') {
                  const ocr = response.data.text;
                  _this.logger.logger.debug('Prediction:');
                  _this.logger.logger.debug(ocr);
                  for (const prediction in ocr) {
                    ocr[prediction].forEach((o: any) => {
                      if (!tinDetails.type && KYC_OCR_REGEX.bir.test(o)) {
                        _this.logger.logger.debug(
                          'File is predicted to be a TIN ID',
                        );
                        tinDetails.type = 'TIN';
                      } else if (prediction == '1') {
                        tinDetails.name = o;
                      } else if (!tinDetails.ref && KYC_OCR_REGEX.tin.test(o)) {
                        const s = o.split(': ');
                        tinDetails.ref = s[1];
                      } else if (tinDetails.ref && prediction == '2') {
                        tinDetails.address = (
                          tinDetails.address +
                          ' ' +
                          o
                        ).trim();
                      } else if (!tinDetails.dob && KYC_OCR_REGEX.dob.test(o)) {
                        const s = o.split(': ');
                        tinDetails.dob = s[1];
                      } else if (
                        !tinDetails.issued &&
                        KYC_OCR_REGEX.issued.test(o)
                      ) {
                        const s = o.split(': ');
                        tinDetails.issued = s[1];
                      }
                    });
                  }
                }
              })
              .catch(function (error: any) {
                _this.logger.logger.error('Axios Error', error);
              });

            const crypto = require('crypto');
            const token = crypto.randomBytes(8);
            const key = token.toString('hex');
            const objectName =
              key + path.extname(file.originalname).toLowerCase();

            let fileResponse = {
              filename: file.originalname,
              isValid: true,
              ocr: {
                prediction: tinDetails,
                kycType: tinDetails.type,
                kycRef: tinDetails.ref,
                objectName: objectName,
                objectLocation: '',
              },
            };

            // TODO: Make a good cognitive indentity validation
            let match = false;
            if (
              subjName === tinDetails.name &&
              subjBday === tinDetails.dob &&
              subjTin === tinDetails.ref
            ) {
              match = true;
            }

            if (!match) {
              fileResponse.isValid = false;
              fileResponse.ocr.objectName = '';
            } else {
              this.logger.logger.debug('TIN Details', tinDetails);
              this.logger.logger.debug('Uploading to S3...');
              const params = {
                Bucket: 'redhat-hackathon-cloudfive-bank-kyc',
                Key: objectName,
                Body: bufferToStream(file.buffer),
              };
              try {
                const stored = await s3.upload(params).promise();
                fileResponse.ocr.objectLocation = stored.Location;
                this.logger.logger.debug(stored.Location);
              } catch (err) {
                this.logger.logger.error('S3 Error', err);
                reject(err);
              }
            }

            res.push(fileResponse);
          }
          resolve(res);
        }
      });
    });
  }

  /**
   * Create KYC document for a given client
   * @param id Client id
   * @param kyc KYC data
   */
  @post('/clients/{id}/kyc', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client.Kyc model instance',
        content: {'application/json': {schema: {'x-ts-type': Kyc}}},
      },
    },
  })
  @authenticate('jwt')
  async createKyc(
    @param.path.string('id') id: typeof Client.prototype.clientId,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Kyc, {
            title: 'NewKycInClient',
            exclude: ['kycId', 'clientId'],
          }),
        },
      },
    })
    kyc: Omit<Kyc, 'kycId'>,
  ): Promise<Kyc> {
    this.logger.logger.info(`POST /client/${id}/kyc`);
    this.logger.logger.debug('Request body:', kyc);
    const client = await this.clientRepository.findById(id);
    this.logger.logger.debug('Client found?', client);
    // if (client) return this.clientRepository.kyc(clientId).create(kyc);
    // else throw new HttpErrors.NotFound(`Client not found - ${clientId}`);
    return this.clientRepository.kyc(id).create(kyc);
  }

  @get('/clients/{id}/kyc', {
    // security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Array of Client has many Kyc',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Kyc)},
          },
        },
      },
    },
  })
  // @authenticate('jwt')
  async findKyc(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Kyc>,
  ): Promise<Kyc[]> {
    this.logger.logger.info(`GET /client/${id}/kyc`);
    let kycs = await this.clientRepository.kyc(id).find(filter);
    kycs.forEach(s => {
      s.objectLocation = generateSignedUrl(s.objectName);
    });
    return kycs;
  }

  @patch('/clients/{id}/kyc', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client.Kyc PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async patchKyc(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Kyc, {partial: true}),
        },
      },
    })
    kyc: Partial<Kyc>,
    @param.query.object('where', getWhereSchemaFor(Kyc)) where?: Where<Kyc>,
  ): Promise<Count> {
    this.logger.logger.info(`PATCH /client/${id}/kyc`);
    return this.clientRepository.kyc(id).patch(kyc, where);
  }

  @del('/clients/{id}/kyc', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client.Kyc DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async deleteKyc(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Kyc)) where?: Where<Kyc>,
  ): Promise<Count> {
    this.logger.logger.info(`DELETE /client/${id}/kyc`);
    return this.clientRepository.kyc(id).delete(where);
  }

  /**
   * Create Speciment Signature for a given client
   * @param id Client id
   */
  @post('/clients/{id}/signature', {
    security: [{jwt: []}],
    responses: {
      200: {
        description: 'Client.Signature model instance',
        content: {'application/json': {schema: {'x-ts-type': Signature}}},
      },
    },
  })
  @authenticate('jwt')
  async clientSignature(
    @param.path.string('id') id: typeof Client.prototype.clientId,
    @requestBody.file() request: Request,
    @inject(RestBindings.Http.RESPONSE) response: Response,
  ): Promise<Signature> {
    this.logger.logger.info(`POST /clients/${id}/signature`);
    const client = await this.clientRepository.findById(id);
    this.logger.logger.debug('Client found?', client);
    console.log(client);

    return new Promise<Signature>((resolve, reject) => {
      const storage = multer.memoryStorage();
      const upload = multer({
        storage: storage,
        limits: {
          fileSize: 1000000, // 10MB, in bytes
          files: 5, // max 5 files per upload
        },
        fileFilter: function (req, file, cb) {
          const filetypes = /jpeg|jpg|png/;
          let mimetype = filetypes.test(file.mimetype);
          let extname = filetypes.test(
            path.extname(file.originalname).toLowerCase(),
          );

          if (mimetype && extname) {
            return cb(null, true);
          }

          cb(
            new HttpErrors.UnprocessableEntity(
              'File not accepted, invalid mimetype',
            ),
          );
        },
      });

      upload.any()(request, response, async (err: any) => {
        if (err) reject(new HttpErrors.UnprocessableEntity(err.message));
        else {
          for (const file of (request as any).files) {
            let formData = new fd();
            formData.append('image', file.buffer, {
              filename: file.originalname,
            });

            const crypto = require('crypto');
            const token = crypto.randomBytes(8);
            const key = token.toString('hex');
            const objectName =
              key + path.extname(file.originalname).toLowerCase();

            let signature = {
              objectName: objectName,
              objectLocation: '',
            };

            this.logger.logger.debug('Uploading to S3...');
            const params = {
              Bucket: 'redhat-hackathon-cloudfive-bank-kyc',
              Key: objectName,
              Body: bufferToStream(file.buffer),
            };
            try {
              const stored = await s3.upload(params).promise();
              signature.objectLocation = stored.Location;
              this.logger.logger.debug(stored.Location);
            } catch (err) {
              this.logger.logger.error('S3 Error', err);
              reject(err);
            }

            resolve(this.clientRepository.signature(id).create(signature));
          }
          reject(new HttpErrors.UnprocessableEntity('File upload error'));
        }
      });
    });
  }

  @get('/clients/{id}/signature', {
    // security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Array of Client has many Signature',
        content: {
          'application/json': {
            schema: {type: 'array', items: getModelSchemaRef(Signature)},
          },
        },
      },
    },
  })
  // @authenticate('jwt')
  async findSignature(
    @param.path.string('id') id: string,
    @param.query.object('filter') filter?: Filter<Signature>,
  ): Promise<Signature[]> {
    this.logger.logger.info(`GET /client/${id}/signature`);
    let signs = await this.clientRepository.signature(id).find(filter);
    signs.forEach(s => {
      s.objectLocation = generateSignedUrl(s.objectName);
    });
    return signs;
  }

  @patch('/clients/{id}/signature', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client.Signature PATCH success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async patchSignature(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(Signature, {partial: true}),
        },
      },
    })
    signature: Partial<Signature>,
    @param.query.object('where', getWhereSchemaFor(Signature))
    where?: Where<Signature>,
  ): Promise<Count> {
    this.logger.logger.info(`PATCH /client/${id}/signature`);
    return this.clientRepository.signature(id).patch(signature, where);
  }

  @del('/clients/{id}/signature', {
    security: [{jwt: []}],
    responses: {
      '200': {
        description: 'Client.Signature DELETE success count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  @authenticate('jwt')
  async deleteSignature(
    @param.path.string('id') id: string,
    @param.query.object('where', getWhereSchemaFor(Signature))
    where?: Where<Signature>,
  ): Promise<Count> {
    this.logger.logger.info(`DELETE /client/${id}/signature`);
    return this.clientRepository.signature(id).delete(where);
  }
}
