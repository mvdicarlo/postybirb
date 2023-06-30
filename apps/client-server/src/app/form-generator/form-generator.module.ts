import { Module } from '@nestjs/common';
import { FormGeneratorService } from './form-generator.service';
import { FormGeneratorController } from './form-generator.controller';
import { WebsitesModule } from '../websites/websites.module';
import { UserSpecifiedWebsiteOptionsModule } from '../user-specified-website-options/user-specified-website-options.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [WebsitesModule, UserSpecifiedWebsiteOptionsModule, AccountModule],
  providers: [FormGeneratorService],
  controllers: [FormGeneratorController],
})
export class FormGeneratorModule {}
