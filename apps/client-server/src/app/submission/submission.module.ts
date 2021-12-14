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
import { SubmissionPartProvider } from './providers/submission-part.provider';
import { SubmissionProvider } from './providers/submission.provider';
import { FileSubmissionService } from './services/file-submission.service';
import { MessageSubmissionService } from './services/message-submission.service';
import { SubmissionPartService } from './services/submission-part.service';
import { SubmissionService } from './services/submission.service';

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
        destination: function (req, file, cb) {
          cb(null, PostyBirbDirectories.TEMP_DIRECTORY);
        },
        filename: function (req, file, cb) {
          cb(null, Date.now() + extname(file.originalname)); //Appending extension
        },
      }),
    }),
  ],
  providers: [
    SubmissionProvider,
    SubmissionPartProvider,
    SubmissionService,
    SubmissionPartService,
    MessageSubmissionService,
    FileSubmissionService,
  ],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
