/**
 * Helper to open the submission history drawer from outside the React tree.
 * Used by notification toasts and the notification drawer.
 */

import { useSubmissionStore } from '../stores/entity/submission-store';
import { useSubmissionHistoryDrawerStore } from '../stores/ui/submission-history-drawer-store';
import { showNotFoundNotification } from './notifications';

/**
 * Open the submission history drawer for a given submission.
 * Checks if the submission still exists before opening.
 * Shows a "not found" warning if it has been deleted.
 *
 * @param submissionId - The submission ID to display history for
 */
export function navigateToSubmissionHistory(
  submissionId: string,
): void {
  const { recordsMap } = useSubmissionStore.getState();

  if (!recordsMap.has(submissionId)) {
    showNotFoundNotification();
    return;
  }

  useSubmissionHistoryDrawerStore.getState().open(submissionId);
}
