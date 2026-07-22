import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsEventListener } from './settings-event.listener';
import { SettingsService } from './settings.service';

@Module({
  providers: [SettingsService, SettingsEventListener],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}
