import { Module } from '@nestjs/common';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { SettingsModule } from '../settings/settings.module';
import { SubmissionModule } from '../submission/submission.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsitesModule } from '../websites/websites.module';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostFileResizerService } from './services/post-file-resizer/post-file-resizer.service';
import { PostManagerService } from './services/post-manager/post-manager.service';
import { PostQueueController } from './services/post-queue/post-queue.controller';
import { PostQueueService } from './services/post-queue/post-queue.service';

@Module({
  imports: [
    WebsiteOptionsModule,
    WebsitesModule,
    PostParsersModule,
    ValidationModule,
    FileConverterModule,
    SettingsModule,
    SubmissionModule,
  ],
  controllers: [PostController, PostQueueController],
  providers: [
    PostService,
    PostManagerService,
    PostFileResizerService,
    WebsiteImplProvider,
    PostQueueService,
  ],
})
export class PostModule {}
