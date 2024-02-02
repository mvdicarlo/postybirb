import { forwardRef, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 } from 'uuid';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { FileModule } from '../file/file.module';
import { WebsiteOptionsModule } from '../website-options/website-options.module';
import { WebsitesModule } from '../websites/websites.module';
import { FileSubmissionController } from './file-submission.controller';
import { FileSubmissionService } from './services/file-submission.service';
import { MessageSubmissionService } from './services/message-submission.service';
import { SubmissionService } from './services/submission.service';
import { SubmissionController } from './submission.controller';

@Module({
  imports: [
    DatabaseModule,
    WebsitesModule,
    AccountModule,
    FileModule,
    forwardRef(() => WebsiteOptionsModule),
    MulterModule.register({
      limits: {
        fileSize: 3e8, // Max 300MB
      },
      storage: diskStorage({
        destination(req, file, cb) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename(req, file, cb) {
          cb(null, v4() + extname(file.originalname)); // Appending extension
        },
      }),
    }),
  ],
  providers: [
    SubmissionService,
    MessageSubmissionService,
    FileSubmissionService,
  ],
  controllers: [SubmissionController, FileSubmissionController],
  exports: [SubmissionService, FileSubmissionService],
})
export class SubmissionModule {}
