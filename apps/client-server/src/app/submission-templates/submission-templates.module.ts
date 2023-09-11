import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { SubmissionTemplatesController } from './submission-templates.controller';
import { SubmissionTemplatesService } from './submission-templates.service';

@Module({
  imports: [DatabaseModule, WebsiteOptionsModule],
  controllers: [SubmissionTemplatesController],
  providers: [SubmissionTemplatesService],
})
export class SubmissionTemplatesModule {}
