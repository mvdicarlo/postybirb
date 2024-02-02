import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsiteImplProvider } from './implementations';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  imports: [DatabaseModule],
  providers: [WebsiteRegistryService, WebsiteImplProvider],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
