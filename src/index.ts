// require('dotenv').config({path: '.development.env'});

import {ApplicationConfig} from '@loopback/core';
import {HackathonCloudfiveApplication} from './application';

export {HackathonCloudfiveApplication};

export async function main(options: ApplicationConfig = {}) {
  const app = new HackathonCloudfiveApplication(options);
  await app.boot();
  await app.start();

  let url: any = '';
  if (process.env.OCP_POD_IP) {
    url = `http://${process.env.OCP_POD_IP}:${process.env.PORT}`;
  } else {
    url = app.restServer.url;
  }

  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}/ping`);

  return app;
}
