import { Module } from '@nestjs/common';
import { PostingActivityService } from './posting-activity.service';

@Module({
  providers: [PostingActivityService],
  exports: [PostingActivityService],
})
export class PostingActivityModule {}
