import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsiteImplProvider } from '../websites/implementations';
import { WebsitesModule } from '../websites/websites.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostFileResizerService } from './services/post-file-resizer/post-file-resizer.service';
import { PostManagerService } from './services/post-manager/post-manager.service';
import { PostQueueService } from './services/post-queue/post-queue.service';

@Module({
  imports: [
    DatabaseModule,
    WebsiteOptionsModule,
    WebsitesModule,
    PostParsersModule,
    ValidationModule,
    FileConverterModule,
  ],
  controllers: [PostController],
  providers: [
    PostService,
    PostManagerService,
    PostFileResizerService,
    WebsiteImplProvider,
    PostQueueService,
  ],
})
export class PostModule {}
