/**
 * Hook for submission posting handlers.
 */

import { useCallback } from 'react';
import postQueueApi from '../../../../api/post-queue.api';
import { useSubmissionStore } from '../../../../stores/submission-store';
import { useUIStore } from '../../../../stores/ui-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostProps {
  /** Current view state */
  viewState: ViewState;
  /** Currently selected IDs */
  selectedIds: string[];
}

interface UseSubmissionPostResult {
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle posting all selected submissions */
  handlePostSelected: () => Promise<void>;
}

/**
 * Hook for handling submission posting.
 */
export function useSubmissionPost({
  viewState,
  selectedIds,
}: UseSubmissionPostProps): UseSubmissionPostResult {
  const setViewState = useUIStore((state) => state.setViewState);

  // Handle posting a submission
  const handlePost = useCallback(async (id: string) => {
    try {
      await postQueueApi.enqueue([id]);
    } catch {
      showPostErrorNotification();
    }
  }, []);

  // Handle posting all selected submissions
  // Filters out submissions that have no websites or have validation errors
  // Uses getState() to get current submissions at call time, avoiding stale closures
  const handlePostSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const { recordsMap } = useSubmissionStore.getState();

    // Filter to only include valid submissions:
    // - Must have at least one website option (excluding default)
    // - Must not have validation errors
    const validIds = selectedIds.filter((id) => {
      const submission = recordsMap.get(id);
      if (!submission) return false;
      return submission.hasWebsiteOptions && !submission.hasErrors;
    });

    if (validIds.length === 0) return;

    try {
      await postQueueApi.enqueue(validIds);

      // Clear selection after posting
      if (isSubmissionsViewState(viewState)) {
        setViewState({
          ...viewState,
          params: {
            ...viewState.params,
            selectedIds: [],
            mode: 'single',
          },
        } as ViewState);
      }
    } catch {
      showPostErrorNotification();
    }
  }, [selectedIds, viewState, setViewState]);

  return {
    handlePost,
    handlePostSelected,
  };
}
