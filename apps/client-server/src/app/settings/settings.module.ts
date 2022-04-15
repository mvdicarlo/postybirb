import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SettingsProvider } from './providers/settings.provider';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [DatabaseModule],
  providers: [SettingsProvider, SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
