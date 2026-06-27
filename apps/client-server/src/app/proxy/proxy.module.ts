import { forwardRef, Module } from '@nestjs/common';
import { AccountRepository } from '@postybirb/database';
import { WebsitesModule } from '../websites/websites.module';
import { PacHttpServerService } from './pac-http-server.service';
import { PacScriptDeliveryService } from './pac-script-delivery.service';
import { PacScriptService } from './pac-script.service';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { WebsiteDomainService } from './website-domain.service';

@Module({
  imports: [forwardRef(() => WebsitesModule)],
  controllers: [ProxyController],
  providers: [
    WebsiteDomainService,
    PacScriptService,
    PacScriptDeliveryService,
    PacHttpServerService,
    ProxyService,
    {
      provide: AccountRepository,
      useFactory: () => new AccountRepository(),
    },
  ],
  exports: [WebsiteDomainService, PacScriptService, ProxyService],
})
export class ProxyModule {}
