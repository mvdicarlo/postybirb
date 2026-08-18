/**
 * Hook for submission posting handlers.
 */

import { useCallback } from 'react';
import postManagerApi from '../../../../api/post-manager.api';
import postingApi, {
    type PostingRequest,
} from '../../../../api/posting.api';
import { useSubmissionStore } from '../../../../stores';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostResult {
  /** Handle canceling a queued/posting submission */
  handleCancel: (id: string) => Promise<void>;
  /** Handle posting submissions with specified order */
  handlePostSelected: (requests: PostingRequest[]) => Promise<void>;
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
    async (requests: PostingRequest[]) => {
      if (requests.length === 0) return;

      const failedSubmissionIds: string[] = [];
      for (const request of requests) {
        try {
          // Sequential staging preserves the order selected in the modal.
          await postingApi.post(request.submissionId, request.evictions);
        } catch {
          failedSubmissionIds.push(request.submissionId);
        }
      }

      const currentViewState = useNavigationStore.getState().viewState;
      if (isSubmissionsViewState(currentViewState)) {
        setViewState({
          ...currentViewState,
          params: {
            ...currentViewState.params,
            selectedIds: failedSubmissionIds,
            mode:
              failedSubmissionIds.length === 0
                ? 'single'
                : currentViewState.params.mode,
          },
        } as ViewState);
      }

      if (failedSubmissionIds.length > 0) {
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
