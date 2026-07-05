import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ProxyPoolEntryDto } from './dtos/proxy-pool-entry.dto';
import { ProxyConnectionTestResult, ProxyService } from './proxy.service';

@ApiTags('proxy')
@Controller('proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @Post('pool/test')
  @ApiOkResponse({ description: 'Proxy pool entry probe result.' })
  testPoolEntryConnection(
    @Body() poolEntry: ProxyPoolEntryDto,
  ): Promise<ProxyConnectionTestResult> {
    return this.proxyService.testPoolEntryConnection(poolEntry);
  }
}
