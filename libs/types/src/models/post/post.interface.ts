import { EntityId, IEntity } from '../database/entity.interface';
import { SubmissionId } from '../submission/submission.interface';
import { UnitOfWorkId } from './unit-of-work.interface';

export type PostId = EntityId;

export interface IPost extends IEntity {
  id: PostId;
  submissionId: SubmissionId;
  unitsOfWork: UnitOfWorkId[];
  completed: boolean;
  cancelled: boolean;
}