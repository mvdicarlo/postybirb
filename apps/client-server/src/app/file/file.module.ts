import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DatabaseModule } from '../database/database.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { MulterFileInfo } from './models/multer-file-info';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({
      limits: {
        fileSize: 3e8, // Max 300MB
      },
      storage: diskStorage({
        destination(
          req: unknown,
          file: MulterFileInfo,
          cb: (_: null, dir: string) => void
        ) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename(
          req: unknown,
          file: MulterFileInfo,
          cb: (_: null, dir: string) => void
        ) {
          cb(null, Date.now() + extname(file.originalname)); // Appending extension
        },
      }),
    }),
  ],
  controllers: [FileController],
  providers: [FileService, CreateFileService, UpdateFileService],
  exports: [FileService],
})
export class FileModule {}
