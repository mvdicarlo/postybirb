import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsitesModule } from '../websites/websites.module';
import { PostFileResizerService } from './post-file-resizer.service';
import { PostManagerService } from './post-manager.service';
import { PostController } from './post.controller';
import { PostService } from './post.service';

@Module({
  imports: [DatabaseModule, WebsiteOptionsModule, WebsitesModule],
  controllers: [PostController],
  providers: [PostService, PostManagerService, PostFileResizerService],
})
export class PostModule {}
