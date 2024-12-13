import { EntityId, IPostQueueRecord, SubmissionId } from '../../models';
import { IEntityDto } from '../database/entity.dto';

export type PostQueueRecordDto = IEntityDto<
  Omit<IPostQueueRecord, 'postRecord' | 'submission'>
> & {
  postRecord?: EntityId;

  submission: SubmissionId;
};
