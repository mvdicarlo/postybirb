import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { WebsitesModule } from '../websites/websites.module';
import { FormGeneratorController } from './form-generator.controller';
import { FormGeneratorService } from './form-generator.service';

@Module({
  imports: [WebsitesModule, UserSpecifiedWebsiteOptionsModule, AccountModule],
  providers: [FormGeneratorService],
  controllers: [FormGeneratorController],
  exports: [FormGeneratorService],
})
export class FormGeneratorModule {}
