import { Entity, Property } from '@mikro-orm/core';
import {
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
} from '@postybirb/types';
import { BaseEntity } from './base.entity';

@Entity()
export class DirectoryWatcher
  extends BaseEntity<DirectoryWatcher>
  implements IDirectoryWatcher
{
  @Property({ nullable: true, type: 'string' })
  path: string;

  @Property({ nullable: false, type: 'string' })
  importAction: DirectoryWatcherImportAction =
    DirectoryWatcherImportAction.NEW_SUBMISSION;

  @Property({ nullable: true })
  template?: object;

  @Property({ nullable: true })
  submissionId?: string;
}
