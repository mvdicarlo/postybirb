import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  Property,
  serialize,
} from '@mikro-orm/core';
import {
  ISubmissionTemplate,
  ISubmissionTemplateDto,
  IWebsiteFormFields,
  SubmissionType,
} from '@postybirb/types';

import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { WebsiteOptions } from './website-options.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class SubmissionTemplate
  extends PostyBirbEntity
  implements ISubmissionTemplate
{
  [EntityRepositoryType]?: PostyBirbRepository<SubmissionTemplate>;

  @Property({ type: 'string', nullable: false })
  name: string;

  @Property({ type: 'string', nullable: false })
  type: SubmissionType;

  @OneToMany({
    entity: () => WebsiteOptions,
    mappedBy: 'template',
    orphanRemoval: true,
    eager: true,
  })
  options = new Collection<
    WebsiteOptions<IWebsiteFormFields>,
    ISubmissionTemplate
  >(this);

  toJSON(): ISubmissionTemplateDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['options', 'options.account'],
      exclude: ['options.submission'],
    }) as ISubmissionTemplateDto;
  }
}
