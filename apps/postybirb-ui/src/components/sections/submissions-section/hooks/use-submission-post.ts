/**
 * Hook for submission posting handlers.
 */

import { PostRecordResumeMode, PostRecordState } from '@postybirb/types';
import { useCallback, useState } from 'react';
import postManagerApi from '../../../../api/post-manager.api';
import postQueueApi from '../../../../api/post-queue.api';
import { useSubmissionStore } from '../../../../stores';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostResult {
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle canceling a queued/posting submission */
  handleCancel: (id: string) => Promise<void>;
  /** Handle posting submissions with specified order */
  handlePostSelected: (orderedIds: string[], resumeMode?: PostRecordResumeMode) => Promise<void>;
  /** ID of submission waiting for resume mode selection */
  pendingResumeSubmissionId: string | null;
  /** Close the resume mode modal without posting */
  cancelResume: () => void;
  /** Post with the selected resume mode */
  confirmResume: (resumeMode: PostRecordResumeMode) => Promise<void>;
}

/**
 * Hook for handling submission posting.
 * Reads store state at call time via getState() for stable callbacks.
 */
export function useSubmissionPost(): UseSubmissionPostResult {
  const setViewState = useNavigationStore((state) => state.setViewState);
  const [pendingResumeSubmissionId, setPendingResumeSubmissionId] = useState<
    string | null
  >(null);

  // Handle posting a submission — reads submissionsMap at call time
  const handlePost = useCallback(
    async (id: string) => {
      try {
        // Get the submission to check if last post failed
        const submission = useSubmissionStore.getState().recordsMap.get(id);

        if (!submission) {
          showPostErrorNotification();
          return;
        }

        // Check if the last post record was failed
        const lastPost = submission.latestPost;
        const shouldPromptResumeMode =
          lastPost && lastPost.state === PostRecordState.FAILED;

        if (shouldPromptResumeMode) {
          // Set pending state to show the modal
          setPendingResumeSubmissionId(id);
          return;
        }

        // No failed post, proceed normally
        await postQueueApi.enqueue([id]);
      } catch {
        showPostErrorNotification();
      }
    },
    [],
  );

  // Cancel resume mode selection
  const cancelResume = useCallback(() => {
    setPendingResumeSubmissionId(null);
  }, []);

  // Confirm and post with selected resume mode
  const confirmResume = useCallback(
    async (resumeMode: PostRecordResumeMode) => {
      if (!pendingResumeSubmissionId) return;

      try {
        await postQueueApi.enqueue([pendingResumeSubmissionId], resumeMode);
        setPendingResumeSubmissionId(null);
      } catch {
        showPostErrorNotification();
        setPendingResumeSubmissionId(null);
      }
    },
    [pendingResumeSubmissionId],
  );

  // Handle canceling a queued/posting submission
  const handleCancel = useCallback(async (id: string) => {
    try {
      await postManagerApi.cancelIfRunning(id);
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
    handlePost,
    handleCancel,
    handlePostSelected,
    pendingResumeSubmissionId,
    cancelResume,
    confirmResume,
  };
}
