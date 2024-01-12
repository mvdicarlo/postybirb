import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [DatabaseModule, WebsiteOptionsModule],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
