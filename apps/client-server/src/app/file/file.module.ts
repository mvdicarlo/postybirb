import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  imports: [
    MulterModule.register({
      dest: PostyBirbDirectories.FILE_DIRECTORY,
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
