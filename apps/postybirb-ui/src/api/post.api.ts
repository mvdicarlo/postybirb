/* eslint-disable lingui/no-unlocalized-strings */
import { JobTreeNode, PreviewResult } from '@postybirb/types';
import { HttpClient, getBaseUrl, getRemotePassword } from '../transports/http-client';

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

  /**
   * Download the NDJSON debug log archive for a submission and trigger a
   * browser save dialog. Bypasses HttpClient because the response is a binary
   * attachment, not JSON.
   */
  async downloadLogs(submissionId: string): Promise<void> {
    const url = new URL(`api/post/${submissionId}/logs`, getBaseUrl());
    const headers: Record<string, string> = {};
    const pw = getRemotePassword();
    if (pw) headers['X-Remote-Password'] = pw;

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`Log download failed (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;

    const disposition = response.headers.get('Content-Disposition');
    const match = disposition?.match(/filename="?([^"]+)"?/);
    anchor.download = match
      ? match[1]
      : `postybirb-post-${submissionId}.ndjson`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

export default new PostApi();
