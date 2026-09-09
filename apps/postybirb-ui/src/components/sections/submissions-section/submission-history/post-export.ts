/**
 * Browser-side export helpers for a submission's post debug payload.
 */

import { SubmissionType, UnitOfWorkState } from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';
import { isRemote } from '../../../../transports/http-client';
import { getUnitErrorMessages, getUnitErrorStack } from './history-utils';

/**
 * Build the debug payload shared by the copy-to-clipboard and download actions.
 * Includes evicted units and raw website responses so failure logs stay complete.
 */
export function buildPostDebugJson(submission: SubmissionRecord): string {
  const { post } = submission;
  if (!post) return '';

  const errors = submission.unitsOfWork
    .filter((unit) => unit.state === UnitOfWorkState.FAILED)
    .map((unit) => {
      const detail =
        getUnitErrorStack(unit) ?? getUnitErrorMessages(unit).join('\n');
      return detail ? `${unit.accountId}: ${detail}` : '';
    })
    .filter(Boolean);

  const payload = {
    submissionType: submission.hasFiles
      ? SubmissionType.FILE
      : SubmissionType.MESSAGE,
    debug: {
      clientVersion: window.electron.app_version,
      isRemote: isRemote(),
      errors,
    },
    post,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Export the submission's post and units of work to a JSON file (browser download).
 */
export function exportPostToFile(
  submission: SubmissionRecord,
): string | undefined {
  const { post } = submission;
  if (!post) return undefined;

  const blob = new Blob([buildPostDebugJson(submission)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const formattedDate = new Date(post.createdAt).toISOString().split('T')[0];
  const filename = `post-${post.id}-${formattedDate}.json`;

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
