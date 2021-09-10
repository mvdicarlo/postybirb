import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';

import { PostyBirbDirectories } from '@postybirb/fs';

import { AppModule } from './app/app.module';

async function bootstrap(appPort?: number) {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.use(compression());

  // PostyBirb Initialization
  PostyBirbDirectories.initializeDirectories();

  const port = process.env.PORT || appPort || 3333;
  await app.listen(port, () => {
    Logger.log('Listening at http://localhost:' + port + '/' + globalPrefix);
  });
}

export { bootstrap as bootstrapClientServer };
