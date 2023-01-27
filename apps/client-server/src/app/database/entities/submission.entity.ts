import { Collection, Entity, OneToMany, Property } from '@mikro-orm/core';
import {
  IBaseSubmissionMetadata,
  ISubmission,
  SubmissionType,
  IBaseWebsiteOptions,
  ISubmissionFile,
  ISubmissionScheduleInfo,
} from '@postybirb/types';

import { BaseEntity } from './base.entity';
import { SubmissionFile } from './submission-file.entity';
import { SubmissionOptions } from './submission-options.entity';

@Entity()
export class Submission<T extends IBaseSubmissionMetadata>
  extends BaseEntity<Submission<T>>
  implements ISubmission<T>
{
  @Property({ type: 'string', nullable: false })
  type: SubmissionType;

  @OneToMany({
    entity: () => SubmissionOptions,
    mappedBy: 'submission',
    orphanRemoval: true,
  })
  options = new Collection<
    SubmissionOptions<IBaseWebsiteOptions>,
    ISubmission<T>
  >(this);

  @OneToMany(() => SubmissionFile, (sf) => sf.submission, {
    orphanRemoval: true,
  })
  files = new Collection<ISubmissionFile>(this);

  @Property({ type: 'boolean', nullable: false })
  isScheduled: boolean;

  @Property({ type: 'json', nullable: false })
  schedule: ISubmissionScheduleInfo;

  @Property({ type: 'json', nullable: false })
  metadata: T;
}
