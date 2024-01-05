import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  Property,
  Rel,
  serialize,
} from '@mikro-orm/core';
import { IPostRecord, IWebsitePostRecord } from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';
import { WebsitePostRecord } from './website-post-record.entity';

/** @inheritdoc */
@Entity({ customRepository: () => PostyBirbRepository })
export class PostRecord extends PostyBirbEntity implements IPostRecord {
  @ManyToOne({ entity: () => Submission, nullable: false, inversedBy: 'posts' })
  parent: Rel<Submission>;

  @Property({
    type: 'date',
    nullable: true,
    serializer: (value) => value.toISOString(),
  })
  completedAt?: Date;

  @OneToMany({
    entity: () => WebsitePostRecord,
    mappedBy: 'parent',
    orphanRemoval: true,
    eager: true,
  })
  children: Collection<IWebsitePostRecord>;

  // TODO add a real dto to pass around
  toJSON(): IPostRecord {
    return serialize(this, { populate: ['children'] }) as IPostRecord;
  }
}
