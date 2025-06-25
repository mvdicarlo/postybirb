import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UpdateCookiesRemoteDto } from './models/update-cookies-remote.dto';
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
