import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { PostingActivityModule } from '../posting/posting-activity.module';
import { SubmissionModule } from '../submission/submission.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsitesModule } from '../websites/websites.module';
import { WebsiteOptionsMigrationService } from './website-options-migration.service';
import { WebsiteOptionsController } from './website-options.controller';
import { WebsiteOptionsService } from './website-options.service';

@Module({
  imports: [
    forwardRef(() => SubmissionModule),
    WebsitesModule,
    AccountModule,
    FormGeneratorModule,
    ValidationModule,
    PostParsersModule,
    PostingActivityModule,
  ],
  providers: [WebsiteOptionsService, WebsiteOptionsMigrationService],
  controllers: [WebsiteOptionsController],
  exports: [WebsiteOptionsService, WebsiteOptionsMigrationService],
})
export class WebsiteOptionsModule {}
