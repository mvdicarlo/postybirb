import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core';
import {
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
  IDirectoryWatcherDto,
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

  toJson(): IDirectoryWatcherDto {
    return {
      ...super.toJson(),
      path: this.path,
      submissionIds: this.submissionIds ? [...this.submissionIds] : undefined,
      template: this.template,
      importAction: this.importAction,
    };
  }
}
