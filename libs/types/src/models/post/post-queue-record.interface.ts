import { Rel } from '@mikro-orm/core';
import { EntityId } from '../database/entity.interface';
import { ISubmission, SubmissionId } from '../submission/submission.interface';
import { IPostRecord } from './post-record.interface';

export interface IPostQueueRecord {
  id: number;

  record?: Rel<IPostRecord>;

  submission: Rel<ISubmission>;

  enqueuedAt: Date;
}

export interface IPostQueueRecordDto {
  id: number;

  record?: EntityId;

  submission: SubmissionId;

  enqueuedAt: string;
}
