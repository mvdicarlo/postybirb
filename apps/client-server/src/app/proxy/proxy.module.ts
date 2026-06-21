import { Module } from '@nestjs/common';
import { AccountRepository } from '@postybirb/database';
import { PacScriptService } from './pac-script.service';
import { ProxyPacController } from './proxy-pac.controller';
import { WebsiteDomainService } from './website-domain.service';

@Module({
  controllers: [ProxyPacController],
  providers: [
    WebsiteDomainService,
    PacScriptService,
    {
      provide: AccountRepository,
      useFactory: () => new AccountRepository(),
    },
  ],
  exports: [WebsiteDomainService, PacScriptService],
})
export class ProxyModule {}
