import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { WebsitesModule } from '../websites/websites.module';
import { SubmissionPartProvider } from './providers/submission-part.provider';
import { SubmissionProvider } from './providers/submission.provider';
import { SubmissionController } from './controllers/submission.controller';
import { SubmissionService } from './services/submission.service';
import { SubmissionPartService } from './services/submission-part.service';

@Module({
  imports: [DatabaseModule, WebsitesModule, AccountModule],
  providers: [
    SubmissionProvider,
    SubmissionPartProvider,
    SubmissionService,
    SubmissionPartService,
  ],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
