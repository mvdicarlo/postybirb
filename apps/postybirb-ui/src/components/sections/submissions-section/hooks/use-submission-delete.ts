/**
 * Hook for submission deletion handlers.
 */

import { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import { useNavigationStore } from '../../../../stores/ui/navigation-store';
import { type ViewState } from '../../../../types/view-state';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
} from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionDeleteResult {
  /** Handle deleting a submission */
  handleDelete: (id: string) => Promise<void>;
  /** Handle deleting all selected submissions */
  handleDeleteSelected: () => Promise<void>;
}

/**
 * Hook for handling submission deletion.
 * Reads viewState at call time via getState() for stable callbacks.
 */
export function useSubmissionDelete(): UseSubmissionDeleteResult {
  const setViewState = useNavigationStore((state) => state.setViewState);

  // Handle deleting a submission — reads state at call time
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await submissionApi.remove([id]);
        showDeletedNotification(1);

        // Remove from selection if selected
        const currentViewState = useNavigationStore.getState().viewState;
        if (isSubmissionsViewState(currentViewState)) {
          const currentSelectedIds = currentViewState.params.selectedIds;
          if (currentSelectedIds.includes(id)) {
            setViewState({
              ...currentViewState,
              params: {
                ...currentViewState.params,
                selectedIds: currentSelectedIds.filter((sid) => sid !== id),
              },
            } as ViewState);
          }
        }
      } catch {
        showDeleteErrorNotification();
      }
    },
    [setViewState],
  );

  // Handle deleting all selected submissions — reads state at call time
  const handleDeleteSelected = useCallback(async () => {
    const currentViewState = useNavigationStore.getState().viewState;
    if (!isSubmissionsViewState(currentViewState)) return;

    const currentSelectedIds = currentViewState.params.selectedIds;
    if (currentSelectedIds.length === 0) return;

    try {
      await submissionApi.remove(currentSelectedIds);
      showDeletedNotification(currentSelectedIds.length);

      // Clear selection
      setViewState({
        ...currentViewState,
        params: {
          ...currentViewState.params,
          selectedIds: [],
          mode: 'single',
        },
      } as ViewState);
    } catch {
      showDeleteErrorNotification();
    }
  }, [setViewState]);

  return {
    handleDelete,
    handleDeleteSelected,
  };
}
