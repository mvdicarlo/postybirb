import { Entity, ManyToOne, Property } from '@mikro-orm/core';
import { IAccount } from '../../account/models/account';
import { IBaseSubmissionMetadata } from '../../submission/models/base-submission-metadata';
import { BaseWebsiteOptions } from '../../submission/models/base-website-options';
import { ISubmissionOptions } from '../../submission/models/submission-options';
import { Account } from './account.entity';
import { BaseEntity } from './base.entity';
import { Submission } from './submission.entity';

@Entity()
export class SubmissionOptions<T extends BaseWebsiteOptions>
  extends BaseEntity<SubmissionOptions<T>, 'id'>
  implements ISubmissionOptions<T>
{
  @ManyToOne({
    entity: () => Submission,
    cascade: [],
    inversedBy: 'options',
    nullable: true,
  })
  submission: Submission<IBaseSubmissionMetadata>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, { nullable: true })
  account?: IAccount;
}
