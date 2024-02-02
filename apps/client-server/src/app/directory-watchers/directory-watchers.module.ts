import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SubmissionModule } from '../submission/submission.module';
import { DirectoryWatchersController } from './directory-watchers.controller';
import { DirectoryWatchersService } from './directory-watchers.service';

@Module({
  imports: [DatabaseModule, SubmissionModule],
  controllers: [DirectoryWatchersController],
  providers: [DirectoryWatchersService],
})
export class DirectoryWatchersModule {}
