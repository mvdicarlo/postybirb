import { IEntity } from '../database/entity.interface';
import { ISubmission } from '../submission/submission.interface';
import { IPostRecord } from './post-record.interface';

export interface IPostQueueRecord extends IEntity {
  postRecord?: IPostRecord;

  submission: ISubmission;
}
