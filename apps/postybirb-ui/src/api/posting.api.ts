import {
    AccountId,
    IUnitOfWork,
    SubmissionFileId,
    SubmissionId,
    UnitOfWorkId,
} from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

type UnitOfWorkEvictions = Record<AccountId, SubmissionFileId[]>;

class PostingApi {
  private readonly client: HttpClient;

  constructor() {
    this.client = new HttpClient('posting');
  }

  post(submissionId: SubmissionId, evictions: UnitOfWorkEvictions = {}) {
    return this.client.post('', { submissionId, evictions });
  }

  dryRun(submissionId: SubmissionId, evictions: UnitOfWorkEvictions = {}) {
    return this.client.post('dry-run', { submissionId, evictions });
  }

  getIncompleteWork(
    submissionId: SubmissionId,
    evictions: UnitOfWorkEvictions = {},
  ) {
    return this.client.post('incomplete-work', { submissionId, evictions });
  }

  isPaused() {
    return this.client.get<{ paused: boolean }>('is-paused');
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
