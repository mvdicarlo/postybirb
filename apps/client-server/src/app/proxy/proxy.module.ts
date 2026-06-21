import { Module } from '@nestjs/common';
import { PacScriptService } from './pac-script.service';
import { ProxyPacController } from './proxy-pac.controller';
import { WebsiteDomainService } from './website-domain.service';

@Module({
  controllers: [ProxyPacController],
  providers: [WebsiteDomainService, PacScriptService],
  exports: [WebsiteDomainService, PacScriptService],
})
export class ProxyModule {}
