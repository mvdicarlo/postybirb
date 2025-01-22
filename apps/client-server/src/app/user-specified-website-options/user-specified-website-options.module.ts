import { Module } from '@nestjs/common';
import { UserSpecifiedWebsiteOptionsController } from './user-specified-website-options.controller';
import { UserSpecifiedWebsiteOptionsService } from './user-specified-website-options.service';

@Module({
  controllers: [UserSpecifiedWebsiteOptionsController],
  providers: [UserSpecifiedWebsiteOptionsService],
  exports: [UserSpecifiedWebsiteOptionsService],
})
export class UserSpecifiedWebsiteOptionsModule {}
