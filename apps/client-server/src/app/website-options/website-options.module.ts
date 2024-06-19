import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { SubmissionModule } from '../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { WebsitesModule } from '../websites/websites.module';
import { WebsiteOptionsController } from './website-options.controller';
import { WebsiteOptionsService } from './website-options.service';

@Module({
  imports: [
    forwardRef(() => SubmissionModule),
    WebsitesModule,
    AccountModule,
    DatabaseModule,
    UserSpecifiedWebsiteOptionsModule,
    PostParsersModule,
    FormGeneratorModule,
  ],
  providers: [WebsiteOptionsService],
  controllers: [WebsiteOptionsController],
  exports: [WebsiteOptionsService],
})
export class WebsiteOptionsModule {}
