import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { Settings } from '../database/entities';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { SettingsService } from './settings.service';

/**
 * CRUD operations for settings.
 * @class SettingsController
 */
@ApiTags('settings')
@Controller('settings')
export class SettingsController extends PostyBirbController<Settings> {
  constructor(readonly service: SettingsService) {
    super(service);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Update successful.' })
  @ApiNotFoundResponse({ description: 'Settings profile not found.' })
  update(
    @Body() updateSettingsDto: UpdateSettingsDto,
    @Param('id') id: string
  ) {
    return this.service.update(id, updateSettingsDto);
  }
}
