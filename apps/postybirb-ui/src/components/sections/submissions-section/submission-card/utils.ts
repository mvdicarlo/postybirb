/**
 * Utility functions for SubmissionCard components.
 */

import { Cron } from 'croner';
import type { SubmissionRecord } from '../../../../stores/records';
import { getBaseUrl } from '../../../../transports/http-client';

/**
 * Resolve the next time a submission is expected to post, falling back to the
 * next cron occurrence for recurring schedules.
 */
export function getNextPostAt(submission: SubmissionRecord): Date | null {
  if (submission.scheduledDate) return submission.scheduledDate;

  const { cron } = submission.schedule;
  if (!cron) return null;

  try {
    return Cron(cron)?.nextRun() ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the thumbnail URL for a submission.
 * Returns undefined if no thumbnail is available.
 */
export function getThumbnailUrl(
  submission: SubmissionRecord,
): string | undefined {
  const { primaryFile } = submission;
  if (!primaryFile) return undefined;

  const baseUrl = getBaseUrl();

  // Use the thumbnail if available
  if (primaryFile.hasThumbnail) {
    return `${baseUrl}/api/file/thumbnail/${primaryFile.id}?${primaryFile.hash}`;
  }

  // Check if it's an image type that can be displayed directly
  if (primaryFile.mimeType?.startsWith('image/')) {
    return `${baseUrl}/api/file/file/${primaryFile.id}?${primaryFile.hash}`;
  }

  return undefined;
}
