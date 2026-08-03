import { Module } from '@nestjs/common';
import { WebsitesModule } from '../websites/websites.module';
import { PostingManager } from './posting-manager';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';

@Module({
  imports: [WebsitesModule],
  controllers: [PostingController],
  providers: [PostingManager, PostingService],
  exports: [PostingManager, PostingService],
})
export class PostingModule {}