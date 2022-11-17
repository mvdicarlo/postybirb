import { Module } from '@nestjs/common';
import { FormGeneratorService } from './form-generator.service';
import { FormGeneratorController } from './form-generator.controller';
import { WebsitesModule } from '../websites/websites.module';

@Module({
  imports: [WebsitesModule],
  providers: [FormGeneratorService],
  controllers: [FormGeneratorController],
})
export class FormGeneratorModule {}
