import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
} from '@postybirb/types';
import { instanceToPlain, plainToClass, Type } from 'class-transformer';
import { directoryWatcher } from '../schemas';
import { DatabaseEntity } from './database-entity';
import { Submission } from './submission.entity';

export class DirectoryWatcher
  extends DatabaseEntity
  implements IDirectoryWatcher
{
  path?: string;

  importAction: DirectoryWatcherImportAction;

  @Type(() => Submission)
  template?: Submission;

  toObject(): IDirectoryWatcher {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as IDirectoryWatcher;
  }

  toDTO(): DirectoryWatcherDto {
    return this.toObject() as unknown as DirectoryWatcherDto;
  }

  static fromDBO(
    entity: typeof directoryWatcher.$inferSelect,
  ): DirectoryWatcher {
    return plainToClass(DirectoryWatcher, entity, {
      enableCircularCheck: true,
    });
  }
}
