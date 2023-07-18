import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  Rel,
  serialize,
  wrap,
} from '@mikro-orm/core';
import {
  ISubmissionMetadata,
  IWebsiteFormFields,
  IWebsiteOptions,
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
  submission: Rel<Submission<ISubmissionMetadata>>;

  @Property({ type: 'json', nullable: false })
  data: T;

  @ManyToOne(() => Account, {
    nullable: false,
    lazy: false,
    serializer: (account) => account.id,
  })
  account: Rel<Account>;

  @Property({ type: 'boolean', nullable: false })
  isDefault = false;

  toJSON(): WebsiteOptionsDto<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['account'],
      exclude: ['submission'],
    }) as WebsiteOptionsDto<T>;
  }
}
