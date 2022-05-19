import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import SubmissionType from '../enums/submission-type';
import { IBaseSubmissionMetadata } from '../models/base-submission-metadata';
import { ISubmissionPart } from '../models/submission-part';
import { ISubmissionScheduleInfo } from '../models/submission-schedule-info';
import { ISubmission } from '../models/submission';
import BaseWebsiteOptions from '../models/base-website-options';
import { SubmissionPart } from './submission-part.entity';

@Entity()
export class Submission<T extends IBaseSubmissionMetadata>
  implements ISubmission<T>
{
  @PrimaryColumn('uuid', { unique: true })
  id: string;

  @Column({ type: 'varchar', nullable: false })
  type: SubmissionType;

  @OneToMany(
    () => SubmissionPart,
    (submissionPart) => submissionPart.submission,
    {
      cascade: true,
      eager: true,
    }
  )
  parts: ISubmissionPart<BaseWebsiteOptions>[];

  @Column({ type: 'boolean', nullable: false })
  isScheduled: boolean;

  @Column({ type: 'simple-json', nullable: false })
  schedule: ISubmissionScheduleInfo;

  @Column({ type: 'simple-json', nullable: false })
  metadata: T;

  @CreateDateColumn()
  created: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}
