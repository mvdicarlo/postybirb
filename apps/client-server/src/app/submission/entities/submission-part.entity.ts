import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Account } from '../../account/entities/account.entity';
import { SafeObject } from '../../shared/types/safe-object';
import { ISubmissionPart } from '../models/submission-part';
import { BaseWebsiteOptions } from '../models/base-website-options';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionPart<T extends BaseWebsiteOptions>
  implements ISubmissionPart<T>
{
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Submission, (submission) => submission.parts, {
    onDelete: 'CASCADE',
    nullable: false,
    eager: false,
  })
  @JoinColumn()
  submission: Submission<SafeObject>;

  @Column({ type: 'simple-json', nullable: false })
  data: T;

  @ManyToOne(() => Account, {
    onDelete: 'CASCADE',
    nullable: true,
    eager: true,
  })
  @JoinColumn()
  account: Account;
}
