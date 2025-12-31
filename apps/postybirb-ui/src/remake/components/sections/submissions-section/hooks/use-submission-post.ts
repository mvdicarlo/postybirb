/**
 * Hook for submission posting handlers.
 */

import { useCallback } from 'react';
import postManagerApi from '../../../../api/post-manager.api';
import postQueueApi from '../../../../api/post-queue.api';
import { useUIStore } from '../../../../stores/ui-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostProps {
  /** Current view state */
  viewState: ViewState;
}

interface UseSubmissionPostResult {
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle canceling a queued/posting submission */
  handleCancel: (id: string) => Promise<void>;
  /** Handle posting submissions with specified order */
  handlePostSelected: (orderedIds: string[]) => Promise<void>;
}

/**
 * Hook for handling submission posting.
 */
export function useSubmissionPost({
  viewState,
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

  // Handle canceling a queued/posting submission
  const handleCancel = useCallback(async (id: string) => {
    try {
      await postManagerApi.cancelIfRunning(id);
    } catch {
      // Silently handle if not running
    }
  }, []);

  // Handle posting submissions in the specified order
  // The orderedIds are pre-filtered to only include valid submissions
  const handlePostSelected = useCallback(
    async (orderedIds: string[]) => {
      if (orderedIds.length === 0) return;

      try {
        await postQueueApi.enqueue(orderedIds);

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
    },
    [viewState, setViewState]
  );

  return {
    handlePost,
    handleCancel,
    handlePostSelected,
  };
}
