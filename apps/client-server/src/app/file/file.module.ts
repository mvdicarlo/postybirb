import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DatabaseModule } from '../database/database.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      limits: {
        fileSize: 3e8, // Max 300MB
      },
      storage: diskStorage({
        destination(req, file, cb) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename(req, file, cb) {
          cb(null, Date.now() + extname(file.originalname)); // Appending extension
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
