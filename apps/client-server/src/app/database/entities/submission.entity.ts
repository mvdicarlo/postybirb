import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import {
  ISubmission,
  ISubmissionDto,
  ISubmissionFields,
  ISubmissionFile,
  ISubmissionFileDto,
  ISubmissionMetadata,
  ISubmissionScheduleInfo,
  SubmissionType,
} from '@postybirb/types';

import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { SubmissionAccountData } from './submission-account-data.entity';
import { SubmissionFile } from './submission-file.entity';

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
    entity: () => SubmissionAccountData,
    mappedBy: 'submission',
    orphanRemoval: true,
  })
  options = new Collection<
    SubmissionAccountData<ISubmissionFields>,
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

  toJson(): ISubmissionDto<T> {
    return {
      ...super.toJson(),
      type: this.type,
      isScheduled: this.isScheduled,
      schedule: this.schedule,
      metadata: this.metadata,
      files: this.files
        .getItems()
        .map((f) => (f as SubmissionFile).toJson()) as ISubmissionFileDto[],
      options: this.options.getItems().map((o) => o.toJson()),
    };
  }
}
