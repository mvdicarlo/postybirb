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
import { SubmissionPartService } from './services/submission-part.service';
import { SubmissionService } from './services/submission.service';
import { SubmissionPartController } from './controllers/submission-part.controller';

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
    SubmissionPartService,
    MessageSubmissionService,
    FileSubmissionService,
  ],
  controllers: [SubmissionController, SubmissionPartController],
})
export class SubmissionModule {}
