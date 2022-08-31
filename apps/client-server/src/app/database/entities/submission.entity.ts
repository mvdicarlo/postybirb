import { Entity, Enum, OneToMany, Property } from '@mikro-orm/core';
import { ISubmissionFile } from '../../file/models/file';
import SubmissionType from '../../submission/enums/submission-type';
import { IBaseSubmissionMetadata } from '../../submission/models/base-submission-metadata';
import { BaseOptions } from '../../submission/models/base-website-options';
import { ISubmission } from '../../submission/models/submission';
import { ISubmissionOptions } from '../../submission/models/submission-options';
import { ISubmissionScheduleInfo } from '../../submission/models/submission-schedule-info';
import { BaseEntity } from './base.entity';
import { SubmissionFile } from './submission-file.entity';
import { SubmissionOptions } from './submission-options.entity';

@Entity()
export class Submission<T extends IBaseSubmissionMetadata>
  extends BaseEntity<Submission<T>, 'id'>
  implements ISubmission<T>
{
  @Property({ nullable: false })
  @Enum(() => SubmissionType)
  type: SubmissionType;

  @OneToMany(() => SubmissionOptions, (swo) => swo.submission, {
    orphanRemoval: true,
    nullable: false,
  })
  options: ISubmissionOptions<BaseOptions>[];

  @OneToMany(() => SubmissionFile, (sf) => sf.submission, {
    orphanRemoval: true,
    nullable: false,
  })
  files: ISubmissionFile[] = [];

  @Property({ type: 'boolean', nullable: false })
  isScheduled: boolean;

  @Property({ type: 'json', nullable: false })
  schedule: ISubmissionScheduleInfo;

  @Property({ type: 'json', nullable: false })
  metadata: T;
}
