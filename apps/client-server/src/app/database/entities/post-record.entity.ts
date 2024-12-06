import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  OneToOne,
  Property,
  Rel,
  serialize,
} from '@mikro-orm/core';
import {
  IPostQueueRecord,
  IPostRecord,
  ISubmission,
  IWebsitePostRecord,
  PostRecordDto,
  PostRecordResumeMode,
  PostRecordState,
} from '@postybirb/types';
import { PostyBirbRepository } from '../repositories/postybirb-repository';
import { PostQueueRecord } from './post-queue-record.entity';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';
import { WebsitePostRecord } from './website-post-record.entity';

/** @inheritdoc */
@Entity({
  customRepository: () => PostyBirbRepository,
})
export class PostRecord extends PostyBirbEntity implements IPostRecord {
  [EntityRepositoryType]?: PostyBirbRepository<PostRecord>;

  @ManyToOne({
    entity: () => Submission,
    nullable: false,
    inversedBy: 'posts',
    serializer: (s) => s.id,
  })
  parent: Rel<ISubmission>;

  @Property({
    type: 'date',
    nullable: true,
    serializer: (value) => value?.toISOString(),
  })
  completedAt?: Date;

  @OneToMany({
    entity: () => WebsitePostRecord,
    mappedBy: 'parent',
    orphanRemoval: true,
    eager: true,
    default: [],
  })
  children: Collection<IWebsitePostRecord>;

  @OneToOne(() => PostQueueRecord, (pqr) => pqr.postRecord, {
    orphanRemoval: true,
    eager: true,
    nullable: true,
  })
  postQueueRecord?: Rel<IPostQueueRecord>;

  @Property({ type: 'string', nullable: false })
  state: PostRecordState = PostRecordState.PENDING;

  @Property({ type: 'string', nullable: false })
  resumeMode: PostRecordResumeMode = PostRecordResumeMode.CONTINUE;

  constructor(
    postRecord: Pick<
      IPostRecord,
      'parent' | 'completedAt' | 'state' | 'resumeMode' | 'postQueueRecord'
    >,
  ) {
    super();
    this.parent = postRecord.parent;
    this.completedAt = postRecord.completedAt;
    this.state = postRecord.state;
    this.resumeMode = postRecord.resumeMode;
  }

  toJSON(): PostRecordDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any, {
      populate: ['children', 'postQueueRecord'],
    }) as PostRecordDto;
  }
}
