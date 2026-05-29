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
import { IsTestEnvironment, PostyBirbEnvConfig } from '@postybirb/utils/common';
import compression from 'compression';
import { DatabaseEntity } from '@postybirb/database';
import { AppModule } from './app/app.module';
import { SSL } from './app/security-and-authentication/ssl';
import { WebSocketAdapter } from './app/web-socket/web-socket-adapter';

class CustomClassSerializer extends ClassSerializerInterceptor {
  serialize(
    response: PlainLiteralObject | PlainLiteralObject[],
    options: ClassTransformOptions,
  ): PlainLiteralObject | PlainLiteralObject[] {
    // Attempts to deal with recursive objects
    return super.serialize(
      response instanceof DatabaseEntity ? response.toDTO() : response,
      options,
    );
  }
}

export type BootstrapOptions = {
  /**
   * Path used to read/write the SSL key+cert. Required for non-test runs.
   * Supplied by the caller (e.g. apps/postybirb's electron main) so this
   * module does not need to instantiate a platform service directly.
   */
  userDataPath?: string;
};

async function bootstrap(options: BootstrapOptions = {}) {
  let app: INestApplication;
  if (!IsTestEnvironment()) {
    if (!options.userDataPath) {
      throw new Error(
        'bootstrapClientServer: userDataPath is required outside of tests',
      );
    }
    const { cert, key } = await SSL.getOrCreateSSL(options.userDataPath);
    app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn'],
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
      transform: true,
    }),
  );
  app.use(compression());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PostyBirb')
    .setDescription('PostyBirb API')
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-remote-password', in: 'header' },
      'x-remote-password',
    )
    .addTag('account')
    .addTag('custom-shortcut')
    .addTag('directory-watchers')
    .addTag('file')
    .addTag('file-submission')
    .addTag('form-generator')
    .addTag('notifications')
    .addTag('post')
    .addTag('post-queue')
    .addTag('submissions')
    .addTag('tag-converters')
    .addTag('tag-groups')
    .addTag('user-converters')
    .addTag('website-option')
    .addTag('websites')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  document.security = [{ 'x-remote-password': [] }];
  SwaggerModule.setup('api', app, document);

  const { port } = PostyBirbEnvConfig;

  await app.listen(port, () => {
    Logger.log(`Listening at https://localhost:${port}/${globalPrefix}`);
  });

  return app;
}

export { bootstrap as bootstrapClientServer };

