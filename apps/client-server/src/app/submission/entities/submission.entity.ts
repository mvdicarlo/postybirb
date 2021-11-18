import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { SafeObject } from '../../shared/types/safe-object.type';
import { ScheduleType } from '../enums/schedule-type.enum';
import SubmissionType from '../enums/submission-type.enum';
import { ISubmissionPart } from '../models/submission-part.interface';
import { ISubmission } from '../models/submission.interface';
import { SubmissionPart } from './submission-part.entity';

@Entity()
export class Submission<T extends SafeObject> implements ISubmission<T> {
  @PrimaryColumn('uuid', { unique: true })
  id: string;

  @Column({ type: 'varchar', nullable: false })
  type: SubmissionType;

  @OneToMany(
    () => SubmissionPart,
    (submissionPart) => submissionPart.submission,
    {
      cascade: true,
    }
  )
  parts: ISubmissionPart<SafeObject>[];

  @Column({ type: 'varchar', nullable: false })
  scheduleType: ScheduleType;

  @Column({ type: 'boolean', nullable: false })
  isScheduled: boolean;

  @Column({ nullable: true })
  scheduledFor: string;

  @Column({ type: 'simple-json', nullable: false })
  metadata: T;
}
