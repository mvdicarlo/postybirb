import { Controller, Get, Post } from '@nestjs/common';
import { UpdateService } from './update.service';

@Controller('update')
export class UpdateController {
  constructor(private readonly service: UpdateService) {}

  @Get()
  checkForUpdates() {
    return this.service.getUpdateState();
  }

  @Post('start')
  update() {
    return this.service.update();
  }
}
