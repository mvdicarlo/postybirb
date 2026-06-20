import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { EntityId } from '@postybirb/types';
import { SettingsRepository } from '@postybirb/database';
import { PostyBirbController } from '../common/controller/postybirb-controller';
import { UpdateSettingsDto } from './dtos/update-settings.dto';
import { UpdateStartupSettingsDto } from './dtos/update-startup-settings.dto';
import {
  TestProxyProfileDto,
  TestRemoteConnectionDto,
} from './dtos/update-proxy-settings.dto';
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

  @Post('startup/proxy/test')
  testProxyConnection(@Body() proxyProfile: TestProxyProfileDto) {
    return this.service.testProxyConnection(proxyProfile);
  }

  @Post('startup/remote/test')
  testRemoteConnection(@Body() remoteConnection: TestRemoteConnectionDto) {
    return this.service.testRemoteConnection(
      remoteConnection.hostUrl,
      remoteConnection.password,
    );
  }

  @Patch('startup/system-startup')
  updateStartupSettings(@Body() startupOptions: UpdateStartupSettingsDto) {
    return this.service.updateStartupSettings(startupOptions);
  }
}
