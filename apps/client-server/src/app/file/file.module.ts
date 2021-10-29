import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { DatabaseModule } from '../database/database.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileDataProvider } from './providers/file-data.provider';
import { FileProvider } from './providers/file.provider';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      limits: {
        fileSize: 3e8, // Max 300MB
      },
      storage: diskStorage({
        destination: function (req, file, cb) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename: function (req, file, cb) {
          cb(null, Date.now() + extname(file.originalname)); //Appending extension
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [FileProvider, FileDataProvider, FileService],
})
export class FileModule {}
