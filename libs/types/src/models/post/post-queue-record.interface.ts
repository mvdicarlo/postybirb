import { Rel } from '@mikro-orm/core';
import { IEntity } from '../database/entity.interface';
import { ISubmission } from '../submission/submission.interface';
import { IPostRecord } from './post-record.interface';

export interface IPostQueueRecord extends IEntity {
  postRecord?: Rel<IPostRecord>;

  submission: Rel<ISubmission>;
}
