import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  Rel,
  wrap,
} from '@mikro-orm/core';
import {
  IAccountDto,
  ISubmissionAccountData,
  ISubmissionAccountDataDto,
  ISubmissionDto,
  ISubmissionFields,
  ISubmissionMetadata,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { Account } from './account.entity';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class SubmissionAccountData<
    T extends ISubmissionFields = ISubmissionFields
  >
  extends PostyBirbEntity
  implements ISubmissionAccountData<T>
{
  [EntityRepositoryType]?: PostyBirbRepository<SubmissionAccountData<T>>;

  @ManyToOne({
    entity: () => Submission,
    cascade: [],
    inversedBy: 'options',
    nullable: true,
    lazy: false,
  })
  submission: Rel<Submission<ISubmissionMetadata>>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, { nullable: true, lazy: false })
  account: Rel<Account>;

  @Property({ type: 'boolean', nullable: false })
  isDefault = false;

  toJson(): ISubmissionAccountDataDto<T> {
    return {
      ...super.toJson(),
      isDefault: this.isDefault,
      data: { ...this.data },
      account: wrap(this.account).toObject() as any,
      submission: wrap(this.submission).toObject(['options']) as any,
    };
  }
}
