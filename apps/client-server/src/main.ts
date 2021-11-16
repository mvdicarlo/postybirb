import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PostyBirbDirectories } from '@postybirb/fs';
import * as compression from 'compression';
import * as sharp from 'sharp';
import { AppModule } from './app/app.module';
import { initialize as initializeLogger, Logger } from '@postybirb/logger';

async function bootstrap(appPort?: number) {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
    })
  );
  app.use(compression());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PostyBirb')
    .setDescription('PostyBirb API')
    .setVersion('1.0')
    .addTag('account')
    .addTag('websites')
    .addTag('file')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // PostyBirb Initialization
  PostyBirbDirectories.initializeDirectories();
  sharp.cache({ files: 0 });

  const logger = Logger('ClientServer');

  const port = process.env.PORT || appPort || 3333;
  await app.listen(port, () => {
    logger.info('Listening at http://localhost:' + port + '/' + globalPrefix);
  });
}

export { bootstrap as bootstrapClientServer };
