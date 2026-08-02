import { Module } from '@nestjs/common';
import { PostingManager } from './posting-manager';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';

@Module({
  controllers: [PostingController],
  providers: [PostingManager, PostingService],
  exports: [PostingManager, PostingService],
})
export class PostingModule {}