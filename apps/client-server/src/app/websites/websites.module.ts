import { Module } from '@nestjs/common';
import { websiteImplementationProvider } from './implementations';
import { WebsiteRegistryService } from './website-registry.service';

@Module({
  providers: [WebsiteRegistryService, websiteImplementationProvider],
  exports: [WebsiteRegistryService],
})
export class WebsitesModule {}
