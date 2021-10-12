import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { websiteImplementationProvider } from './implementations';
import { websiteDataProvider } from './providers/website-data.provider';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  imports: [DatabaseModule],
  providers: [
    WebsiteRegistryService,
    websiteImplementationProvider,
    websiteDataProvider,
  ],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
