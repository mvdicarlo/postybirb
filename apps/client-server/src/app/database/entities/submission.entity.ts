import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  Property,
  serialize,
} from '@mikro-orm/core';
import {
  ISubmission,
  ISubmissionDto,
  ISubmissionFile,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  SubmissionType,
} from '@postybirb/types';

import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { SubmissionFile } from './submission-file.entity';
import { WebsiteOptions } from './website-options.entity';
import { DirectoryWatcher } from './directory-watcher.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class Submission<T extends ISubmissionMetadata = ISubmissionMetadata>
  extends PostyBirbEntity
  implements ISubmission<T>
{
  [EntityRepositoryType]?: PostyBirbRepository<Submission<T>>;

  @Property({ type: 'string', nullable: false })
  type: SubmissionType;

  @OneToMany({
    entity: () => WebsiteOptions,
    mappedBy: 'submission',
    orphanRemoval: true,
    eager: true,
  })
  options = new Collection<WebsiteOptions<IWebsiteFormFields>, ISubmission<T>>(
    this
  );

  @OneToMany(() => SubmissionFile, (sf) => sf.submission, {
    orphanRemoval: true,
    eager: true,
  })
  files = new Collection<ISubmissionFile>(this);

  @OneToMany(() => DirectoryWatcher, (dw) => dw.template, {
    orphanRemoval: false,
    lazy: true,
    hidden: true,
  })
  directoryWatchers = new Collection<DirectoryWatcher>(this);

  @Property({ type: 'boolean', nullable: false })
  isScheduled: boolean;

  @Property({ type: 'json', nullable: false })
  schedule: ISubmissionScheduleInfo;

  @Property({ type: 'json', nullable: false })
  metadata: T;

  toJSON(): ISubmissionDto<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['files', 'options', 'options.account'],
    }) as ISubmissionDto<T>;
  }
}
