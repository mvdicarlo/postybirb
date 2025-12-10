/**
 * Utility functions for FileSubmissionCard components.
 */

import type { SubmissionRecord } from '../../../../stores/records';
import { defaultTargetProvider } from '../../../../transports/http-client';

/**
 * Get the thumbnail URL for a submission.
 * Returns undefined if no thumbnail is available.
 */
export function getThumbnailUrl(
  submission: SubmissionRecord
): string | undefined {
  const { primaryFile } = submission;
  if (!primaryFile) return undefined;

  const baseUrl = defaultTargetProvider();

  // Use the thumbnail if available
  if (primaryFile.hasThumbnail) {
    return `${baseUrl}/api/file/thumbnail/${primaryFile.id}`;
  }

  // Check if it's an image type that can be displayed directly
  if (primaryFile.mimeType?.startsWith('image/')) {
    return `${baseUrl}/api/file/file/${primaryFile.id}`;
  }

  return undefined;
}
