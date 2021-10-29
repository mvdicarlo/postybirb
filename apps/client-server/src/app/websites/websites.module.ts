import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { websiteImplementationProvider } from './implementations';
import { WebsiteDataProvider } from './providers/website-data.provider';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  imports: [DatabaseModule],
  providers: [
    WebsiteRegistryService,
    websiteImplementationProvider,
    WebsiteDataProvider,
  ],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
