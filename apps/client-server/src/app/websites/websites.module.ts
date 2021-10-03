import { Module } from '@nestjs/common';
import { websiteImplementationProvider } from './implementations';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  providers: [WebsiteRegistryService, websiteImplementationProvider],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
