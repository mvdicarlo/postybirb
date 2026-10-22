import { UpdateCookiesRemoteDto } from '@postybirb/types';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { RemoteService } from './remote.service';

@Controller('remote')
export class RemoteController {
  constructor(private readonly remoteService: RemoteService) {}

  @Get('ping/:password')
  ping(@Param('password') password: string) {
    return this.remoteService.validate(password);
  }

  @Post('set-cookies')
  setCookies(@Body() updateCookies: UpdateCookiesRemoteDto) {
    return this.remoteService.setCookies(updateCookies);
  }
}
