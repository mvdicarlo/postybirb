import { Entity, Enum, OneToMany, Property } from '@mikro-orm/core';
import { ISubmissionFile } from '../../file/models/file';
import SubmissionType from '../../submission/enums/submission-type';
import { IBaseSubmissionMetadata } from '../../submission/models/base-submission-metadata';
import { BaseWebsiteOptions } from '../../submission/models/base-website-options';
import { ISubmission } from '../../submission/models/submission';
import { ISubmissionPart } from '../../submission/models/submission-part';
import { ISubmissionScheduleInfo } from '../../submission/models/submission-schedule-info';
import { BaseEntity } from './base.entity';
import { SubmissionFile } from './submission-file';
import { SubmissionWebsiteOptions } from './submission-website-options';

@Entity()
export class Submission<T extends IBaseSubmissionMetadata>
  extends BaseEntity<Submission<T>, 'id'>
  implements ISubmission<T>
{
  @Property({ nullable: false })
  @Enum(() => SubmissionType)
  type: SubmissionType;

  @OneToMany(() => SubmissionWebsiteOptions, (swo) => swo.submission, {
    orphanRemoval: true,
    nullable: false,
  })
  parts: ISubmissionPart<BaseWebsiteOptions>[];

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
