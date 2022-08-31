import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { IAccount } from '../../account/models/account';
import { SafeObject } from '../../shared/types/safe-object';
import { BaseOptions } from '../../submission/models/base-website-options';
import { ISubmission } from '../../submission/models/submission';
import { ISubmissionOptions } from '../../submission/models/submission-options';
import { Account } from './account.entity';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionOptions<T extends BaseOptions>
  extends BaseEntity<SubmissionOptions<T>, 'id'>
  implements ISubmissionOptions<T>
{
  @ManyToOne({
    entity: () => Submission,
    cascade: [],
    inversedBy: 'options',
    nullable: true,
  })
  submission: ISubmission<SafeObject>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, { nullable: true })
  account?: IAccount;
}
