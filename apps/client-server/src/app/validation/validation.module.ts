import { Module } from '@nestjs/common';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { FileModule } from '../file/file.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { WebsitesModule } from '../websites/websites.module';
import { ValidationService } from './validation.service';

@Module({
  imports: [WebsitesModule, PostParsersModule, FileConverterModule, FileModule],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
