import { Module } from '@nestjs/common';
import { FileConverterModule } from '../file-converter/file-converter.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostParsersModule } from '../post-parsers/post-parsers.module';
import { ValidationModule } from '../validation/validation.module';
import { WebsitesModule } from '../websites/websites.module';
import { LegacyPostHistoryMigrationService } from './legacy-post-history-migration.service';
import { PostFileResizerService } from './post-file-resizer/post-file-resizer.service';
import { PostingActivityModule } from './posting-activity.module';
import { PostingManager } from './posting-manager';
import { PostingRateLimiterService } from './posting-rate-limiter.service';
import { PostingController } from './posting.controller';
import { PostingService } from './posting.service';

@Module({
  imports: [
    PostingActivityModule,
    WebsitesModule,
    ValidationModule,
    PostParsersModule,
    FileConverterModule,
    NotificationsModule,
  ],
  controllers: [PostingController],
  providers: [
    LegacyPostHistoryMigrationService,
    PostingManager,
    PostingRateLimiterService,
    PostingService,
    PostFileResizerService,
  ],
  exports: [PostingManager, PostingService],
})
export class PostingModule {}
