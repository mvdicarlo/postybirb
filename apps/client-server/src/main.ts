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
import {
  IsTestEnvironment,
  PostyBirbEnvConfig,
} from '@postybirb/utils/electron';
import compression from 'compression';
import sharp from 'sharp';
import { AppModule } from './app/app.module';
import { DatabaseEntity } from './app/drizzle/models';
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

async function bootstrap() {
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

  const globalPrefix = 'api';
  app.enableCors();
  app.useWebSocketAdapter(new WebSocketAdapter(app));
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalInterceptors(new CustomClassSerializer(app.get(Reflector)));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
    }),
  );
  app.use(compression());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('PostyBirb')
    .setDescription('PostyBirb API')
    .setVersion('1.0')
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
  SwaggerModule.setup('api', app, document);

  sharp.cache({ files: 0 });

  const { port } = PostyBirbEnvConfig;

  await app.listen(port, () => {
    Logger.log(`Listening at https://localhost:${port}/${globalPrefix}`);
  });

  return app;
}

export { bootstrap as bootstrapClientServer };
