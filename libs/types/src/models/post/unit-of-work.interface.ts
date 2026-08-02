import { UnitOfWorkState } from '../../enums';
import { AccountId } from '../account/account.interface';
import { EntityId, IEntity } from '../database/entity.interface';
import {
    SubmissionFileId,
} from '../submission/submission-file.interface';
import { SubmissionId } from '../submission/submission.interface';
import { PostId } from './post.interface';

export type UnitOfWorkId = EntityId;

export interface IUnitOfWork extends IEntity {
  id: UnitOfWorkId;
  postId: PostId;
  submissionId: SubmissionId;
  accountId: AccountId;
  fileId?: SubmissionFileId;
  fileHash?: string;
  attempt: number;
  data?: Record<string, unknown>;
  response?: Record<string, unknown>;
  evicted: boolean;
  url?: string;
  batch?: EntityId;
  state: UnitOfWorkState;
}