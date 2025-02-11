import { forwardRef, Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { FormGeneratorModule } from '../form-generator/form-generator.module';
import { SubmissionModule } from '../submission/submission.module';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsitesModule } from '../websites/websites.module';
import { WebsiteOptionsController } from './website-options.controller';
import { WebsiteOptionsService } from './website-options.service';

@Module({
  imports: [
    forwardRef(() => SubmissionModule),
    WebsitesModule,
    AccountModule,
    UserSpecifiedWebsiteOptionsModule,
    FormGeneratorModule,
    ValidationModule,
  ],
  providers: [WebsiteOptionsService],
  controllers: [WebsiteOptionsController],
  exports: [WebsiteOptionsService],
})
export class WebsiteOptionsModule {}
