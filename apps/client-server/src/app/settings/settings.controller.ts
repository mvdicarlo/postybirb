import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsService } from './settings.service';

/**
 * CRUD operations for settings.
 * @class SettingsController
 */
@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOkResponse({ description: 'A list of all settings records.' })
  findAll() {
    return this.service.findAll();
  }

  @Patch()
  @ApiOkResponse({ description: 'Update successful.' })
  @ApiNotFoundResponse({ description: 'Settings profile not found.' })
  update(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.service.update(updateSettingsDto);
  }
}
