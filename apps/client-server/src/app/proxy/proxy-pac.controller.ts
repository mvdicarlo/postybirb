import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StartupOptionsManager } from '@postybirb/utils/common';
import { Response } from 'express';
import { PacScriptService } from './pac-script.service';

@ApiTags('proxy')
@Controller('proxy/pac')
export class ProxyPacController {
  constructor(private readonly pacScriptService: PacScriptService) {}

  @Get(':token')
  async getPacScript(@Param('token') token: string, @Res() res: Response) {
    const proxy = StartupOptionsManager.get().proxy;
    const expectedToken = proxy.pacAccessToken?.trim();

    if (!expectedToken || token !== expectedToken) {
      throw new NotFoundException();
    }

    const body = await this.pacScriptService.generate(proxy);

    res.setHeader('Content-Type', 'application/x-ns-proxy-autoconfig');
    res.setHeader('Cache-Control', 'no-store');
    res.send(body);
  }
}
