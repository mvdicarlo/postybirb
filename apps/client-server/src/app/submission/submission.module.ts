import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostyBirbDirectories } from '@postybirb/fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { FileModule } from '../file/file.module';
import { WebsitesModule } from '../websites/websites.module';
import { SubmissionController } from './controllers/submission.controller';
import { FileSubmissionService } from './services/file-submission.service';
import { MessageSubmissionService } from './services/message-submission.service';
import { SubmissionOptionsService } from './services/submission-options.service';
import { SubmissionService } from './services/submission.service';
import { SubmissionOptionsController } from './controllers/submission-options.controller';

@Module({
  imports: [
    DatabaseModule,
    WebsitesModule,
    AccountModule,
    FileModule,
    MulterModule.register({
      limits: {
        fileSize: 3e8, // Max 300MB
      },
      storage: diskStorage({
        destination(req, file, cb) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename(req, file, cb) {
          cb(null, Date.now() + extname(file.originalname)); // Appending extension
        },
      }),
    }),
  ],
  providers: [
    SubmissionService,
    SubmissionOptionsService,
    MessageSubmissionService,
    FileSubmissionService,
  ],
  controllers: [SubmissionController, SubmissionOptionsController],
})
export class SubmissionModule {}
