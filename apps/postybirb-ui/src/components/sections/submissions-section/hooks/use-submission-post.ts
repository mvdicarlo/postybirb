/**
 * Hook for submission posting handlers.
 */

import { NodeStatus, PostRecordResumeMode } from '@postybirb/types';
import { useCallback, useState } from 'react';
import postManagerApi from '../../../../api/post-manager.api';
import postQueueApi from '../../../../api/post-queue.api';
import { useSubmissionStore } from '../../../../stores';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
import { type ViewState } from '../../../../types/view-state';
import { showPostErrorNotification } from '../../../../utils/notifications';
import { availablePostModes, inspectPostHistory } from '../post-mode-modal';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionPostResult {
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle canceling a queued/posting submission */
  handleCancel: (id: string) => Promise<void>;
  /** Handle posting submissions with specified order */
  handlePostSelected: (
    orderedIds: string[],
    resumeMode?: PostRecordResumeMode,
  ) => Promise<void>;
  pendingPostModeSubmissionId: string | null;
  pendingPostModeStatus?: NodeStatus;
  pendingPostModeHasNewFiles: boolean;
  cancelPostMode: () => void;
  confirmPostMode: (resumeMode: PostRecordResumeMode) => Promise<void>;
}

/**
 * Hook for handling submission posting.
 * Reads store state at call time via getState() for stable callbacks.
 */
export function useSubmissionPost(): UseSubmissionPostResult {
  const setViewState = useNavigationStore((state) => state.setViewState);
  const [pendingPostModeSubmissionId, setPendingPostModeSubmissionId] =
    useState<string | null>(null);
  const [pendingPostModeStatus, setPendingPostModeStatus] =
    useState<NodeStatus>();
  const [pendingPostModeHasNewFiles, setPendingPostModeHasNewFiles] =
    useState(false);

  // Handle posting a submission — reads submissionsMap at call time
  const handlePost = useCallback(async (id: string) => {
    try {
      const submission = useSubmissionStore.getState().recordsMap.get(id);

      if (!submission) {
        showPostErrorNotification();
        return;
      }

      const { hasHistory, newestStatus, hasNewFiles } =
        await inspectPostHistory(
          id,
          submission.files.map((file) => file.id),
        );
      if (hasHistory) {
        if (availablePostModes(newestStatus).length === 0) {
          showPostErrorNotification();
          return;
        }
        setPendingPostModeHasNewFiles(hasNewFiles);
        setPendingPostModeStatus(newestStatus);
        setPendingPostModeSubmissionId(id);
        return;
      }

      await postQueueApi.enqueue([id]);
    } catch {
      showPostErrorNotification();
    }
  }, []);

  const cancelPostMode = useCallback(() => {
    setPendingPostModeSubmissionId(null);
    setPendingPostModeStatus(undefined);
  }, []);

  const confirmPostMode = useCallback(
    async (resumeMode: PostRecordResumeMode) => {
      if (!pendingPostModeSubmissionId) return;

      try {
        await postQueueApi.enqueue([pendingPostModeSubmissionId], resumeMode);
      } catch {
        showPostErrorNotification();
      } finally {
        setPendingPostModeSubmissionId(null);
        setPendingPostModeStatus(undefined);
      }
    },
    [pendingPostModeSubmissionId],
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
    [setViewState],
  );

  return {
    handlePost,
    handleCancel,
    handlePostSelected,
    pendingPostModeSubmissionId,
    pendingPostModeStatus,
    pendingPostModeHasNewFiles,
    cancelPostMode,
    confirmPostMode,
  };
}
