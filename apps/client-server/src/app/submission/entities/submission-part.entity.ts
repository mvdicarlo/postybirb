import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Account } from '../../account/entities/account.entity';
import { IAccount } from '../../account/models/account.interface';
import { SafeObject } from '../../shared/types/safe-object.type';
import { ISubmissionPart } from '../models/submission-part.interface';
import { ISubmission } from '../models/submission.interface';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionPart<T extends SafeObject>
  implements ISubmissionPart<T>
{
  @PrimaryColumn('uuid', { unique: true })
  id: string;

  @ManyToOne(() => Submission, (submission) => submission.parts, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  @JoinColumn()
  submission: Submission<SafeObject>;

  @Column({ type: 'simple-json', nullable: false })
  data: T;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: true,
  })
  @JoinColumn()
  account: Account;
}
