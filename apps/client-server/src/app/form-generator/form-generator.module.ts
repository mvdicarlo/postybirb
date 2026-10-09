import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { WebsitesModule } from '../websites/websites.module';
import { FormGeneratorController } from './form-generator.controller';
import { FormGeneratorService } from './form-generator.service';

@Module({
  imports: [WebsitesModule, AccountModule],
  providers: [FormGeneratorService],
  controllers: [FormGeneratorController],
  exports: [FormGeneratorService],
})
export class FormGeneratorModule {}
