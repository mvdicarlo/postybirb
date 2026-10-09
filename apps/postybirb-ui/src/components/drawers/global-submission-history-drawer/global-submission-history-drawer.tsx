/**
 * GlobalSubmissionHistoryDrawer - Globally-mounted wrapper that connects
 * the SubmissionHistoryDrawer to its Zustand store.
 * Renders null when closed to avoid unnecessary store subscriptions.
 */

import { useSubmissionsMap } from '../../../stores/entity/submission-store';
import {
    useSubmissionHistoryDrawerActions,
    useSubmissionHistoryDrawerState,
} from '../../../stores/ui/submission-history-drawer-store';
import { SubmissionHistoryDrawer } from '../../sections/submissions-section/submission-history-drawer';

export function GlobalSubmissionHistoryDrawer() {
  const { opened, submissionId } = useSubmissionHistoryDrawerState();
  const { close } = useSubmissionHistoryDrawerActions();
  const submissionsMap = useSubmissionsMap();

  const submission = submissionId ? submissionsMap.get(submissionId) ?? null : null;

  return (
    <SubmissionHistoryDrawer
      opened={opened}
      onClose={close}
      submission={submission}
    />
  );
}
