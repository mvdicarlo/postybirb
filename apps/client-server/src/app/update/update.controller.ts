import { Controller, Get, Post } from '@nestjs/common';
import { UpdateService, UpdateState } from './update.service';

@Controller('update')
export class UpdateController {
  constructor(private readonly service: UpdateService) {}

  /**
   * Checks for updates.
   * @returns For some reason, to fix error while
   * build we need to directly import and specify type
   */
  @Get()
  checkForUpdates(): UpdateState {
    return this.service.getUpdateState();
  }

  @Post('start')
  update() {
    return this.service.update();
  }
}
