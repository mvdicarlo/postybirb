import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsitesModule } from '../websites/websites.module';
import { SubmissionPartProvider } from './providers/submission-part.provider';
import { SubmissionProvider } from './providers/submission.provider';

@Module({
  imports: [DatabaseModule, WebsitesModule],
  providers: [SubmissionProvider, SubmissionPartProvider],
})
export class SubmissionModule {}
