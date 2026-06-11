import { Module } from '@nestjs/common';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { SettingsModule } from '../settings/settings.module';
import { SubmissionModule } from '../submission/submission.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsiteImplProvider } from '../websites/implementations/provider';
import { WebsitesModule } from '../websites/websites.module';
import { RateLimiter } from './engine/rate-limiter';
import { RelayFileProcessor } from './engine/file-processor';
import { RelayPersistence } from './engine/persistence';
import { RelayPipelineDeps } from './engine/pipeline-deps';
import { RelayPostManager } from './engine/post-manager.service';
import { RelayPreviewService } from './engine/preview.service';
import { RelayTracer } from './engine/tracer.service';
import { SharpEncoder } from './engine/sharp-encoder';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostFileResizerService } from './services/post-file-resizer/post-file-resizer.service';
import { PostManagerController } from './services/post-manager/post-manager.controller';
import { PostQueueController } from './services/post-queue/post-queue.controller';
import { PostQueueService } from './services/post-queue/post-queue.service';

/**
 * Posting module. The Relay engine is the sole posting executor; the post
 * queue records what to post and the RelayPostManager owns running it.
 */
@Module({
  imports: [
    WebsiteOptionsModule,
    WebsitesModule,
    PostParsersModule,
    ValidationModule,
    FileConverterModule,
    SettingsModule,
    SubmissionModule,
    NotificationsModule,
  ],
  controllers: [PostController, PostQueueController, PostManagerController],
  providers: [
    PostService,
    PostFileResizerService,
    WebsiteImplProvider,
    PostQueueService,
    RelayTracer,
    RateLimiter,
    SharpEncoder,
    RelayFileProcessor,
    RelayPipelineDeps,
    RelayPreviewService,
    RelayPersistence,
    RelayPostManager,
  ],
  exports: [RelayPostManager],
})
export class PostModule {}
