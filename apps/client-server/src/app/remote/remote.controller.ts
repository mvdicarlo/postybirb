import { Controller, Get, Param } from '@nestjs/common';
import { RemoteService } from './remote.service';

@Controller('remote')
export class RemoteController {
  constructor(private readonly remoteService: RemoteService) {}

  @Get('ping/:password')
  ping(@Param('password') password: string) {
    return this.remoteService.validate(password);
  }
}
