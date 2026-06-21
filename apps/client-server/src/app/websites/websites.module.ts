import { Module } from '@nestjs/common';
import { WebsiteImplProvider } from './implementations/provider';
import { ProxyModule } from '../proxy/proxy.module';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  imports: [ProxyModule],
  providers: [WebsiteRegistryService, WebsiteImplProvider],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
