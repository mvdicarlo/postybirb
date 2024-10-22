import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  Rel,
  serialize,
} from '@mikro-orm/core';
import {
  ISubmission,
  IWebsiteFormFields,
  IWebsiteOptions,
  NULL_ACCOUNT_ID,
  WebsiteOptionsDto,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { Account } from './account.entity';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class WebsiteOptions<T extends IWebsiteFormFields = IWebsiteFormFields>
  extends PostyBirbEntity
  implements IWebsiteOptions<T>
{
  [EntityRepositoryType]?: PostyBirbRepository<WebsiteOptions<T>>;

  @ManyToOne({
    entity: () => Submission,
    cascade: [],
    inversedBy: 'options',
    nullable: true,
    lazy: false,
  })
  submission: Rel<ISubmission>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, {
    nullable: false,
    lazy: false,
    serializer: (account) => account.id,
  })
  account: Rel<Account>;

  @Property({ persist: false })
  get isDefault() {
    return this?.account?.id === NULL_ACCOUNT_ID;
  }

  constructor(websiteOptions: Partial<IWebsiteOptions<T>>) {
    super();
    this.submission = websiteOptions.submission;
    this.data = websiteOptions.data;
    this.account = websiteOptions.account as Account;
  }

  toJSON(): WebsiteOptionsDto<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['account'],
      exclude: ['submission'],
    }) as WebsiteOptionsDto<T>;
  }
}
