import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

@Module({
  controllers: [FileController],
  providers: [FileService, CreateFileService, UpdateFileService],
  exports: [FileService],
})
export class FileModule {}
