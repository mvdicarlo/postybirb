import { Select } from '@postybirb/database';
import { IEntity } from '../database/entity.interface';
import { ISubmission } from '../submission/submission.interface';
import { IPostRecord } from './post-record.interface';

export interface IPostQueueRecord
  extends IEntity,
    Select<'PostQueueRecordSchema'> {
  postRecord?: IPostRecord;

  submission: ISubmission;
}
