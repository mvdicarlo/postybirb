import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { SubmissionModule } from '../submission/submission.module';
import { WebsitesModule } from '../websites/websites.module';
import { SubmissionOptionsController } from './submission-options.controller';
import { SubmissionOptionsService } from './submission-options.service';

@Module({
  imports: [
    forwardRef(() => SubmissionModule),
    WebsitesModule,
    AccountModule,
    DatabaseModule,
  ],
  providers: [SubmissionOptionsService],
  controllers: [SubmissionOptionsController],
  exports: [SubmissionOptionsService],
})
export class SubmissionOptionsModule {}
