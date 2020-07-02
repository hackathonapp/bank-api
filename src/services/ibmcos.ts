import crypto from 'crypto';
import moment from 'moment';
// const crypto = require('crypto');
// const moment = require('moment');

const accessKey = process.env.CLOUDFIVE_APP_IBMCOS_S3_ACCESSKEY || '';
const secretKey = process.env.CLOUDFIVE_APP_IBMCOS_S3_SECRET || '';
const httpMethod = 'GET';
const endpoint = process.env.CLOUDFIVE_APP_IBMCOS_S3_ENDPOINT || '';
const region = '';
const bucket = 'redhat-hackathon-cloudfive-bank-kyc';

// hashing and signing methods
function hash(key: string, msg: string) {
  var hmac = crypto.createHmac('sha256', key);
  hmac.update(msg, 'utf8');
  return hmac.digest();
}

function hmacHex(key: string, msg: string) {
  var hmac = crypto.createHmac('sha256', key);
  hmac.update(msg, 'utf8');
  return hmac.digest('hex');
}

function hashHex(msg: string) {
  var hash = crypto.createHash('sha256');
  hash.update(msg);
  return hash.digest('hex');
}

// region is a wildcard value that takes the place of the AWS region value
// as COS doesn't use the same conventions for regions, this parameter can accept any string
function createSignatureKey(
  key: string,
  datestamp: string,
  region: string,
  service: string,
) {
  const keyDate: any = hash('AWS4' + key, datestamp);
  const keyString: any = hash(keyDate, region);
  const keyService: any = hash(keyString, service);
  const keySigning = hash(keyService, 'aws4_request');
  return keySigning;
}

function createHexSignatureKey(
  key: string,
  datestamp: string,
  region: string,
  service: string,
) {
  const keyDate: any = hashHex('AWS4' + key); //, datestamp);
  const keyString: any = hashHex(keyDate); //, region);
  const keyService: any = hashHex(keyString); //, service);
  const keySigning: any = hashHex(keyService); //, 'aws4_request');
  return keySigning;
}

export function generateSignedUrl(
  objectKey: string,
  expiration: number = 86400,
) {
  // assemble the standardized request
  var time = moment().utc();
  var timestamp = time.format('YYYYMMDDTHHmmss') + 'Z';
  var datestamp = time.format('YYYYMMDD');

  var standardizedQuerystring =
    'X-Amz-Algorithm=AWS4-HMAC-SHA256' +
    '&X-Amz-Credential=' +
    encodeURIComponent(
      accessKey + '/' + datestamp + '/' + region + '/s3/aws4_request',
    ) +
    '&X-Amz-Date=' +
    timestamp +
    '&X-Amz-Expires=' +
    expiration.toString() +
    '&X-Amz-SignedHeaders=host';

  var standardizedResource = '/' + bucket + '/' + objectKey;

  var payloadHash = 'UNSIGNED-PAYLOAD';
  var standardizedHeaders = 'host:' + endpoint.substring(8);
  var signedHeaders = 'host';

  var standardizedRequest =
    httpMethod +
    '\n' +
    standardizedResource +
    '\n' +
    standardizedQuerystring +
    '\n' +
    standardizedHeaders +
    '\n' +
    '\n' +
    signedHeaders +
    '\n' +
    payloadHash;

  // assemble string-to-sign
  var hashingAlgorithm = 'AWS4-HMAC-SHA256';
  var credentialScope =
    datestamp + '/' + region + '/' + 's3' + '/' + 'aws4_request';
  var sts =
    hashingAlgorithm +
    '\n' +
    timestamp +
    '\n' +
    credentialScope +
    '\n' +
    hashHex(standardizedRequest);

  // generate the signature
  const signatureKey: any = createSignatureKey(
    secretKey,
    datestamp,
    region,
    's3',
  );
  const signature = hmacHex(signatureKey, sts);

  // create and send the request
  // the 'requests' package autmatically adds the required 'host' header
  var requestUrl =
    endpoint +
    '/' +
    bucket +
    '/' +
    objectKey +
    '?' +
    standardizedQuerystring +
    '&X-Amz-Signature=' +
    signature;

  return requestUrl;
}
