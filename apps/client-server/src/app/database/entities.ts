import { Account } from '../account/entities/account.entity';
import { FileData } from '../file/entities/file-data.entity';
import { File } from '../file/entities/file.entity';
import { Settings } from '../settings/entities/settings.entity';
import { SubmissionPart } from '../submission/entities/submission-part.entity';
import { Submission } from '../submission/entities/submission.entity';
import { WebsiteData } from '../websites/entities/website-data.entity';

export const entities = [
  Account,
  File,
  FileData,
  Settings,
  Submission,
  SubmissionPart,
  WebsiteData,
];
