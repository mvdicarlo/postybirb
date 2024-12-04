import {
    Entity,
    ManyToOne,
    OneToOne,
    PrimaryKey,
    Property,
    Rel,
    serialize,
    Unique,
} from '@mikro-orm/core';
import {
    IPostQueueRecord,
    IPostRecord,
    ISubmission,
    WebsitePostRecordDto,
} from '@postybirb/types';
import { PostRecord } from './post-record.entity';
import { Submission } from './submission.entity';

@Entity()
export class PostQueueRecord implements IPostQueueRecord {
  @Unique()
  @PrimaryKey({ autoincrement: true })
  id: number;

  @OneToOne({ entity: () => PostRecord, nullable: true, orphanRemoval: false })
  record?: Rel<IPostRecord>;

  @ManyToOne({
    entity: () => Submission,
    nullable: false,
    serializer: (s) => s.id,
  })
  submission: Rel<ISubmission>;

  @Property({
    serializer: (value) => value.toISOString(),
  })
  enqueuedAt: Date = new Date();

  toJSON(): WebsitePostRecordDto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return serialize(this as any) as WebsitePostRecordDto;
  }
}
