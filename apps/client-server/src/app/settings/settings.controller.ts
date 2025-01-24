import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { UpdateStartupSettingsDto } from './dtos/update-startup-settings.dto';
import { SettingsService } from './settings.service';

/**
 * CRUD operations for settings.
 * @class SettingsController
 */
@ApiTags('settings')
@Controller('settings')
export class SettingsController extends PostyBirbController<'settings'> {
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
