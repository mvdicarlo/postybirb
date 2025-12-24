/**
 * Hook for submission deletion handlers.
 */

import { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import { useUIStore } from '../../../../stores/ui-store';
import { type ViewState } from '../../../../types/view-state';
import {
  showDeletedNotification,
  showDeleteErrorNotification,
} from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionDeleteProps {
  /** Current view state */
  viewState: ViewState;
  /** Currently selected IDs */
  selectedIds: string[];
}

interface UseSubmissionDeleteResult {
  /** Handle deleting a submission */
  handleDelete: (id: string) => Promise<void>;
  /** Handle deleting all selected submissions */
  handleDeleteSelected: () => Promise<void>;
}

/**
 * Hook for handling submission deletion.
 */
export function useSubmissionDelete({
  viewState,
  selectedIds,
}: UseSubmissionDeleteProps): UseSubmissionDeleteResult {
  const setViewState = useUIStore((state) => state.setViewState);

  // Handle deleting a submission
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await submissionApi.remove([id]);
        showDeletedNotification(1);

        // Remove from selection if selected
        if (isSubmissionsViewState(viewState) && selectedIds.includes(id)) {
          setViewState({
            ...viewState,
            params: {
              ...viewState.params,
              selectedIds: selectedIds.filter((sid) => sid !== id),
            },
          } as ViewState);
        }
      } catch {
        showDeleteErrorNotification();
      }
    },
    [viewState, selectedIds, setViewState],
  );

  // Handle deleting all selected submissions
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;

    try {
      await submissionApi.remove(selectedIds);
      showDeletedNotification(selectedIds.length);

      // Clear selection
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
      showDeleteErrorNotification();
    }
  }, [selectedIds, viewState, setViewState]);

  return {
    handleDelete,
    handleDeleteSelected,
  };
}
