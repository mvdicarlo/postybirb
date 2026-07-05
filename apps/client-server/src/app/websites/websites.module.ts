import { forwardRef, Module } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { WebsiteImplProvider } from './implementations/provider';
import { WebsiteRegistryService } from './website-registry.service';
import { WebsitesController } from './websites.controller';

@Module({
  imports: [forwardRef(() => ProxyModule)],
  providers: [WebsiteRegistryService, WebsiteImplProvider],
  exports: [WebsiteRegistryService],
  controllers: [WebsitesController],
})
export class WebsitesModule {}
