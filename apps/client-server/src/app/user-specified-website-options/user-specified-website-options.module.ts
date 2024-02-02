import { Module } from '@nestjs/common';
import { UserSpecifiedWebsiteOptionsController } from './user-specified-website-options.controller';
import { UserSpecifiedWebsiteOptionsService } from './user-specified-website-options.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [UserSpecifiedWebsiteOptionsController],
  providers: [UserSpecifiedWebsiteOptionsService],
  exports: [UserSpecifiedWebsiteOptionsService],
})
export class UserSpecifiedWebsiteOptionsModule {}
