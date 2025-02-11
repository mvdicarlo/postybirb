import { Module } from '@nestjs/common';
import { WebsiteImplProvider } from './implementations/provider';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  providers: [WebsiteRegistryService, WebsiteImplProvider],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
