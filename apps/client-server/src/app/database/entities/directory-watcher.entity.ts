import {
  Entity,
  EntityRepositoryType,
  Property,
  serialize,
} from '@mikro-orm/core';
import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class DirectoryWatcher
  extends PostyBirbEntity
  implements IDirectoryWatcher
{
  [EntityRepositoryType]?: PostyBirbRepository<DirectoryWatcher>;

  @Property({ nullable: true, type: 'string' })
  path: string;

  @Property({ nullable: false, type: 'string' })
  importAction: DirectoryWatcherImportAction =
    DirectoryWatcherImportAction.NEW_SUBMISSION;

  @Property({ nullable: true })
  template?: object;

  @Property({ nullable: true })
  submissionIds?: string[];

  toJSON(): DirectoryWatcherDto {
    return serialize(this) as DirectoryWatcherDto;
  }
}
