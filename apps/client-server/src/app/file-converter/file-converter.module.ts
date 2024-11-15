import { Module } from '@nestjs/common';
import { FileConverterService } from './file-converter.service';

@Module({
  providers: [FileConverterService],
  exports: [FileConverterService],
})
export class FileConverterModule {}
