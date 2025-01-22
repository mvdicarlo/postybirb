import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  EntityPrimitive,
  IDirectoryWatcher,
} from '@postybirb/types';
import { instanceToPlain, Type } from 'class-transformer';
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

  toObject(): EntityPrimitive<IDirectoryWatcher> {
    return instanceToPlain(this, {
      enableCircularCheck: true,
    }) as EntityPrimitive<IDirectoryWatcher>;
  }

  toDTO(): DirectoryWatcherDto {
    return this.toObject() as unknown as DirectoryWatcherDto;
  }
}
