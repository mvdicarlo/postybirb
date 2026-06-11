import { JobTreeNode, PreviewResult } from '@postybirb/types';
import { HttpClient } from '../transports/http-client';

class PostApi {
  private readonly client = new HttpClient('post');

  /** Snapshot of currently-active Relay job trees (UI store seed). */
  getActiveJobs() {
    return this.client.get<JobTreeNode[]>('jobs/active');
  }

  /** Relay posting history (job trees, newest first) for a submission. */
  getJobHistory(submissionId: string) {
    return this.client.get<JobTreeNode[]>(`${submissionId}/jobs`);
  }

  /**
   * Dry-run preview: per-account file conversion/resize results for a
   * submission, without posting anything.
   */
  preview(submissionId: string) {
    return this.client.get<PreviewResult>(`${submissionId}/preview`);
  }
}

export default new PostApi();
