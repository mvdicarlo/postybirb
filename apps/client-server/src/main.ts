import { MikroORM } from '@mikro-orm/core';
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
import compression from 'compression';
import sharp from 'sharp';
import { AppModule } from './app/app.module';
import { PostyBirbEntity } from './app/database/entities/postybirb-entity';
import { SSL } from './app/security-and-authentication/ssl';
import { IsTestEnvironment } from './app/utils/test.util';
import { WebSocketAdapter } from './app/web-socket/web-socket-adapter';

class CustomClassSerializer extends ClassSerializerInterceptor {
  serialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    options: ClassTransformOptions
  ): PlainLiteralObject | PlainLiteralObject[] {
    // Attempts to deal with recursive objects
    return super.serialize(
      response instanceof PostyBirbEntity ? response.toJSON() : response,
      options
    );
  }
}

async function bootstrap(appPort?: number) {
  let app: INestApplication;
  if (!IsTestEnvironment()) {
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

  await app.get(MikroORM).getSchemaGenerator().ensureDatabase();
  await app.get(MikroORM).getSchemaGenerator().updateSchema();

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
    .addTag('directory-watchers')
    .addTag('file')
    .addTag('file-submission')
    .addTag('form-generator')
    .addTag('submission')
    .addTag('tag-converters')
    .addTag('tag-groups')
    .addTag('website-option')
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
