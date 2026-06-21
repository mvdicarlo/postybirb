import { Module } from '@nestjs/common';
import { WebsiteDomainService } from './website-domain.service';

@Module({
  providers: [WebsiteDomainService],
  exports: [WebsiteDomainService],
})
export class ProxyModule {}
