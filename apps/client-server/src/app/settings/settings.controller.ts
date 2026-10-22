import {
  EntityId,
  UpdateSettingsDto,
  UpdateStartupSettingsDto,
} from '@postybirb/types';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { SettingsRepository } from '@postybirb/database';
import { PostyBirbController } from '../common/controller/postybirb-controller';

import { SettingsService } from './settings.service';

/**
 * CRUD operations for settings.
 * @class SettingsController
 */
@ApiTags('settings')
@Controller('settings')
export class SettingsController extends PostyBirbController<SettingsRepository> {
  constructor(readonly service: SettingsService) {
    super(service);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update successful.' })
  @ApiNotFoundResponse({ description: 'Settings profile not found.' })
  update(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @Param('id') id: EntityId,
  ) {
    return this.service
      .update(id, updateSettingsDto)
      .then((entity) => entity.toDTO());
  }

  @Get('startup')
  getStartupSettings() {
    return this.service.getStartupSettings();
  }

  @Patch('startup/system-startup')
  updateStartupSettings(@Body() startupOptions: UpdateStartupSettingsDto) {
    return this.service.updateStartupSettings(startupOptions);
  }
}
