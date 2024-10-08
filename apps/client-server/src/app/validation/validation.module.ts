import { Module } from '@nestjs/common';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { WebsitesModule } from '../websites/websites.module';
import { ValidationService } from './validation.service';

@Module({
  imports: [WebsitesModule, PostParsersModule],
  providers: [ValidationService],
  exports: [ValidationService],
})
export class ValidationModule {}
