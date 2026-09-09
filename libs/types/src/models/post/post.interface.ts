import { EntityId, IEntity } from '../database/entity.interface';
import { SubmissionId } from '../submission/submission.interface';
import { IUnitOfWork } from './unit-of-work.interface';

export type PostId = EntityId;

export interface IPost extends IEntity {
  id: PostId;
  submissionId: SubmissionId;
  unitsOfWork: IUnitOfWork[];
  completed: boolean;
  cancelled: boolean;
}