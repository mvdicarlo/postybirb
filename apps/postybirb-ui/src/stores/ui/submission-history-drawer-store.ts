/**
 * Store for controlling the global SubmissionHistoryDrawer.
 * Allows opening the history drawer from anywhere (toasts, notification drawer, etc.)
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';

interface SubmissionHistoryDrawerState {
  /** Whether the drawer is open */
  opened: boolean;
  /** The submission ID to display history for */
  submissionId: string | null;
}

interface SubmissionHistoryDrawerActions {
  /** Open the drawer for a specific submission */
  open: (submissionId: string) => void;
  /** Close the drawer */
  close: () => void;
}

type SubmissionHistoryDrawerStore = SubmissionHistoryDrawerState &
  SubmissionHistoryDrawerActions;

export const useSubmissionHistoryDrawerStore =
  create<SubmissionHistoryDrawerStore>()((set) => ({
    opened: false,
    submissionId: null,
    open: (submissionId: string) => set({ opened: true, submissionId }),
    close: () => set({ opened: false, submissionId: null }),
  }));

/**
 * Select drawer state.
 */
export const useSubmissionHistoryDrawerState = () =>
  useSubmissionHistoryDrawerStore(
    useShallow((state) => ({
      opened: state.opened,
      submissionId: state.submissionId,
    })),
  );

/**
 * Select drawer actions.
 */
export const useSubmissionHistoryDrawerActions = () =>
  useSubmissionHistoryDrawerStore(
    useShallow((state) => ({
      open: state.open,
      close: state.close,
    })),
  );
