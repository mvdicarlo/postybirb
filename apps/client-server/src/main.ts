import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { PostyBirbDirectories } from '@postybirb/fs';

import { AppModule } from './app/app.module';

async function bootstrap(appPort?: number) {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.use(compression());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PostyBirb')
    .setDescription('PostyBirb API')
    .setVersion('1.0')
    .addTag('postybirb')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // PostyBirb Initialization
  PostyBirbDirectories.initializeDirectories();

  const port = process.env.PORT || appPort || 3333;
  await app.listen(port, () => {
    Logger.log('Listening at http://localhost:' + port + '/' + globalPrefix);
  });
}

export { bootstrap as bootstrapClientServer };
