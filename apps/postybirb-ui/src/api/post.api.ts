import {
    IPostWaitState,
    IQueuePostRecordRequestDto,
    JobTreeNode,
    PostRecordDto,
} from '@postybirb/types';
import { BaseApi } from './base.api';

class PostApi extends BaseApi<
  PostRecordDto,
  IQueuePostRecordRequestDto,
  IQueuePostRecordRequestDto
> {
  constructor() {
    super('post');
  }

  getWaitStates() {
    return this.client.get<IPostWaitState[]>('active/wait-states');
  }

  /** Snapshot of currently-active Relay job trees (UI store seed). */
  getActiveJobs() {
    return this.client.get<JobTreeNode[]>('jobs/active');
  }

  /** Relay posting history (job trees, newest first) for a submission. */
  getJobHistory(submissionId: string) {
    return this.client.get<JobTreeNode[]>(`${submissionId}/jobs`);
  }
}

export default new PostApi();
