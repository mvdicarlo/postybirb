import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
  SubmissionId,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class DirectoryWatcher
  extends DatabaseEntity
  implements IDirectoryWatcher
{
  path?: string;

  templateId: SubmissionId;

  importAction: DirectoryWatcherImportAction;

  @Type(() => Submission)
  template: Submission;

  toObject(): IDirectoryWatcher {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IDirectoryWatcher;
  }

  toDTO(): DirectoryWatcherDto {
    return this.toObject() as unknown as DirectoryWatcherDto;
  }
}
