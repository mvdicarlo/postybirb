import { Module } from '@nestjs/common';
import { WebsiteRegistryService } from './website-registry.service';

@Module({
  providers: [WebsiteRegistryService],
  exports: [WebsiteRegistryService],
})
export class WebsitesModule {}
