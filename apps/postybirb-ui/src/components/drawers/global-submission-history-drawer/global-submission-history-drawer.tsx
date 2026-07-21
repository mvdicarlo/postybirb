/**
 * GlobalSubmissionHistoryDrawer - Globally-mounted wrapper that connects
 * the SubmissionHistoryDrawer to its Zustand store.
 * Renders null when closed to avoid unnecessary store subscriptions.
 */

import { useSubmission } from '../../../stores/entity/submission-store';
import {
  useSubmissionHistoryDrawerActions,
  useSubmissionHistoryDrawerState,
} from '../../../stores/ui/submission-history-drawer-store';
import { SubmissionHistoryDrawer } from '../../sections/submissions-section/submission-history-drawer';

export function GlobalSubmissionHistoryDrawer() {
  const { opened, submissionId } = useSubmissionHistoryDrawerState();
  const { close } = useSubmissionHistoryDrawerActions();

  if (!opened || !submissionId) return null;

  return (
    <OpenSubmissionHistoryDrawer
      submissionId={submissionId}
      onClose={close}
    />
  );
}

function OpenSubmissionHistoryDrawer({
  submissionId,
  onClose,
}: {
  submissionId: string;
  onClose: () => void;
}) {
  const submission = useSubmission(submissionId) ?? null;

  return (
    <SubmissionHistoryDrawer
      opened
      onClose={onClose}
      submission={submission}
    />
  );
}
