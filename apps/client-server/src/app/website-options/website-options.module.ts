import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { SubmissionModule } from '../submission/submission.module';
import { WebsitesModule } from '../websites/websites.module';
import { WebsiteOptionsController } from './website-options.controller';
import { WebsiteOptionsService } from './website-options.service';

@Module({
  imports: [
    forwardRef(() => SubmissionModule),
    WebsitesModule,
    AccountModule,
    DatabaseModule,
  ],
  providers: [WebsiteOptionsService],
  controllers: [WebsiteOptionsController],
  exports: [WebsiteOptionsService],
})
export class WebsiteOptionsModule {}
