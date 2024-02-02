import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  Rel,
  serialize,
} from '@mikro-orm/core';
import {
  DirectoryWatcherDto,
  DirectoryWatcherImportAction,
  IDirectoryWatcher,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';

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

  @ManyToOne(() => Submission, {
    nullable: true,
    lazy: false,
    serializer: (s) => s?.id,
    cascade: [],
  })
  template?: Rel<Submission>;

  toJSON(): DirectoryWatcherDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['template'],
    }) as DirectoryWatcherDto;
  }
}
