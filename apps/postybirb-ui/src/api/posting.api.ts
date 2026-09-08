import {
  AccountId,
  IPost,
  IUnitOfWork,
  SubmissionFileId,
  SubmissionId,
  UnitOfWorkId,
} from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

export type UnitOfWorkEvictions = Record<AccountId, SubmissionFileId[]>;
export type PostingTargets = Record<AccountId, SubmissionFileId[]>;

export interface PostingRequest {
  submissionId: SubmissionId;
  evictions: UnitOfWorkEvictions;
  targets?: PostingTargets;
}

export interface IncompleteWork {
  remainingWork: IUnitOfWork[];
  removedWork: IUnitOfWork[];
  evicted: IUnitOfWork[];
}

export interface PostingDryRun extends IncompleteWork {
  paused: boolean;
  dependenciesCompleted: boolean;
  executableWork: IUnitOfWork[];
  deferredWork: IUnitOfWork[];
}

class PostingApi {
  private readonly client: HttpClient;

  constructor() {
    this.client = new HttpClient('posting');
  }

  post(submissionId: SubmissionId, evictions: UnitOfWorkEvictions = {}, targets?: PostingTargets) {
    return this.client.post<IPost>('', { submissionId, evictions, targets });
  }

  dryRun(submissionId: SubmissionId, evictions: UnitOfWorkEvictions = {}, targets?: PostingTargets) {
    return this.client.post<PostingDryRun>('dry-run', {
      submissionId,
      evictions,
      targets,
    });
  }

  getIncompleteWork(
    submissionId: SubmissionId,
    evictions: UnitOfWorkEvictions = {},
    targets?: PostingTargets,
  ) {
    return this.client.post<IncompleteWork>('incomplete-work', {
      submissionId,
      evictions,
      targets,
    });
  }

  isPaused() {
    return this.client.get<{ paused: boolean }>('is-paused');
  }

  pause() {
    return this.client.post<{ paused: boolean }>('pause', {});
  }

  unpause() {
    return this.client.post<{ paused: boolean }>('unpause', {});
  }

  evictUnitOfWork(unitOfWorkId: UnitOfWorkId) {
    return this.client.post<IUnitOfWork>(`evict/${unitOfWorkId}`, {});
  }

  cancelPost(postId: string, reason?: string) {
    return this.client.post(`cancel/${postId}`, { reason });
  }
}

export default new PostingApi();
