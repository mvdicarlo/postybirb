import { Module } from '@nestjs/common';
import { AccountRepository } from '@postybirb/database';
import { PacScriptService } from './pac-script.service';
import { ProxyController } from './proxy.controller';
import { ProxyPacController } from './proxy-pac.controller';
import { ProxyService } from './proxy.service';
import { WebsiteDomainService } from './website-domain.service';

@Module({
  controllers: [ProxyPacController, ProxyController],
  providers: [
    WebsiteDomainService,
    PacScriptService,
    ProxyService,
    {
      provide: AccountRepository,
      useFactory: () => new AccountRepository(),
    },
  ],
  exports: [WebsiteDomainService, PacScriptService, ProxyService],
})
export class ProxyModule {}
