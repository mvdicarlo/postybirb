import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { CreateFileService } from './services/create-file.service';
import { UpdateFileService } from './services/update-file.service';

@Module({
  imports: [DatabaseModule],
  controllers: [FileController],
  providers: [FileService, CreateFileService, UpdateFileService],
  exports: [FileService],
})
export class FileModule {}
