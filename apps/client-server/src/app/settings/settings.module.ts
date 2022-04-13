import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AccountProvider } from '../account/providers/account.provider';

@Module({
  providers: [SettingsService, AccountProvider],
  controllers: [SettingsController],
})
export class SettingsModule {}
