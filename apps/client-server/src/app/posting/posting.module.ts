import { Module } from '@nestjs/common';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsitesModule } from '../websites/websites.module';
import { PostingManager } from './posting-manager';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';

@Module({
  imports: [WebsitesModule, ValidationModule, PostParsersModule],
  controllers: [PostingController],
  providers: [PostingManager, PostingService],
  exports: [PostingManager, PostingService],
})
export class PostingModule {}