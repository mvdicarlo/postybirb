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
  @OneToOne({
    entity: () => PostRecord,
    nullable: true,
    orphanRemoval: false,
    inversedBy: 'postQueueRecord',
    serializer: (pr) => pr.id,
  })
  postRecord?: Rel<IPostRecord>;

  @OneToOne({
    entity: () => Submission,
    nullable: false,
    serializer: (s) => s.id,
    inversedBy: 'postQueueRecord',
    orphanRemoval: false,
  })
  submission: Rel<ISubmission>;

  toJSON(): PostQueueRecordDto {
    return serialize(this) as PostQueueRecordDto;
  }
}
