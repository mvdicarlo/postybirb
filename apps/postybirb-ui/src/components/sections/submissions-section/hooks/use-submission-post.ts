/**
 * Hook for submission posting handlers.
 */

import { PostRecordResumeMode } from '@postybirb/types';
import { useCallback } from 'react';
import postManagerApi from '../../../../api/post-manager.api';
import postQueueApi from '../../../../api/post-queue.api';
import postingApi from '../../../../api/posting.api';
import { useSubmissionStore } from '../../../../stores';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostResult {
  /** Handle canceling a queued/posting submission */
  handleCancel: (id: string) => Promise<void>;
  /** Handle posting submissions with specified order */
  handlePostSelected: (orderedIds: string[], resumeMode?: PostRecordResumeMode) => Promise<void>;
}

/**
 * Hook for handling submission posting.
 * Reads store state at call time via getState() for stable callbacks.
 */
export function useSubmissionPost(): UseSubmissionPostResult {
  const setViewState = useNavigationStore((state) => state.setViewState);

  // Handle canceling a queued/posting submission
  const handleCancel = useCallback(async (id: string) => {
    try {
      const submission = useSubmissionStore.getState().recordsMap.get(id);
      if (submission?.post && !submission.post.completed) {
        await postingApi.cancelPost(submission.post.id);
      } else {
        await postManagerApi.cancelIfRunning(id);
      }
    } catch {
      // Silently handle if not running
    }
  }, []);

  // Handle posting submissions in the specified order — reads viewState at call time
  const handlePostSelected = useCallback(
    async (orderedIds: string[], resumeMode?: PostRecordResumeMode) => {
      if (orderedIds.length === 0) return;

      try {
        await postQueueApi.enqueue(orderedIds, resumeMode);

        // Clear selection after posting
        const currentViewState = useNavigationStore.getState().viewState;
        if (isSubmissionsViewState(currentViewState)) {
          setViewState({
            ...currentViewState,
            params: {
              ...currentViewState.params,
              selectedIds: [],
              mode: 'single',
            },
          } as ViewState);
        }
      } catch {
        showPostErrorNotification();
      }
    },
    [setViewState]
  );

  return {
    handleCancel,
    handlePostSelected,
  };
}
