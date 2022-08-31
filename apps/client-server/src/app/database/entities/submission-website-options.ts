import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { SafeObject } from '../../shared/types/safe-object';
import { BaseWebsiteOptions } from '../../submission/models/base-website-options';
import { ISubmission } from '../../submission/models/submission';
import { ISubmissionPart } from '../../submission/models/submission-part';
import { Account } from './account.entity';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';

// TODO mass rename
@Entity()
export class SubmissionWebsiteOptions<T extends BaseWebsiteOptions>
  extends BaseEntity<SubmissionWebsiteOptions<T>, 'id'>
  implements ISubmissionPart<T>
{
  @ManyToOne(() => Submission, { nullable: false })
  submission: ISubmission<SafeObject>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, { nullable: false })
  account: Account;
}
