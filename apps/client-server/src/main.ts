import {
  ClassSerializerInterceptor,
  INestApplication,
  Logger,
  PlainLiteralObject,
  ValidationPipe,
} from '@nestjs/common';
import { ClassTransformOptions } from '@nestjs/common/interfaces/external/class-transform-options.interface';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PostyBirbDirectories } from '@postybirb/fs';
import * as compression from 'compression';
import * as sharp from 'sharp';
import { AppModule } from './app/app.module';
import { BaseEntity } from './app/database/entities/base.entity';
import { initializeDatabase } from './app/database/mikroorm.providers';
import { SSL } from './app/security-and-authentication/ssl';
import { WebSocketAdapter } from './app/web-socket/web-socket-adapter';

class CustomClassSerializer extends ClassSerializerInterceptor {
  serialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    options: ClassTransformOptions
  ): PlainLiteralObject | PlainLiteralObject[] {
    // Attempts to deal with recursive objects
    return super.serialize(
      response instanceof BaseEntity ? response.toJSON() : response,
      options
    );
  }
}

async function bootstrap(appPort?: number) {
  await initializeDatabase();

  let app: INestApplication;
  if (process.env.NODE_ENV !== 'Test') {
    // TLS/SSL on non-test
    const { cert, key } = await SSL.getOrCreateSSL();
    app = await NestFactory.create(AppModule, {
      httpsOptions: {
        key,
        cert,
      },
    });
  } else {
    app = await NestFactory.create(AppModule);
  }

  const globalPrefix = 'api';
  app.enableCors();
  app.useWebSocketAdapter(new WebSocketAdapter(app));
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalInterceptors(new CustomClassSerializer(app.get(Reflector)));
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
    .addTag('file')
    .addTag('submission')
    .addTag('submission-option')
    .addTag('websites')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // PostyBirb Initialization
  PostyBirbDirectories.initializeDirectories();
  sharp.cache({ files: 0 });

  const port = process.env.APP_PORT || appPort || 3333;

  await app.listen(port, () => {
    Logger.log(`Listening at https://localhost:${port}/${globalPrefix}`);
  });

  return app;
}

export { bootstrap as bootstrapClientServer };
