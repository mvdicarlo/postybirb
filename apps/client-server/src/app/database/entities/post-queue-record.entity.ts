import { Entity, OneToOne, Rel, serialize } from '@mikro-orm/core';
import {
  IPostQueueRecord,
  IPostRecord,
  ISubmission,
  PostQueueRecordDto,
} from '@postybirb/types';
import { PostRecord } from './post-record.entity';
import { PostyBirbEntity } from './postybirb-entity';
import { Submission } from './submission.entity';

@Entity()
export class PostQueueRecord
  extends PostyBirbEntity
  implements IPostQueueRecord
{
  @OneToOne(() => PostRecord, {
    nullable: true,
    orphanRemoval: false,
    serializer: (pr) => pr.id,
    eager: true,
    inversedBy: 'postQueueRecord',
  })
  postRecord?: Rel<IPostRecord>;

  @OneToOne({
    entity: () => Submission,
    nullable: false,
    serializer: (s) => s.id,
    mappedBy: 'postQueueRecord',
    orphanRemoval: false,
    eager: true,
  })
  submission: Rel<ISubmission>;

  toJSON(): PostQueueRecordDto {
    return serialize(this) as PostQueueRecordDto;
  }
}
