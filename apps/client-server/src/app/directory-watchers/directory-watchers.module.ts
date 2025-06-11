import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubmissionModule } from '../submission/submission.module';
import { DirectoryWatchersController } from './directory-watchers.controller';
import { DirectoryWatchersService } from './directory-watchers.service';

@Module({
  imports: [SubmissionModule, NotificationsModule],
  controllers: [DirectoryWatchersController],
  providers: [DirectoryWatchersService],
})
export class DirectoryWatchersModule {}
