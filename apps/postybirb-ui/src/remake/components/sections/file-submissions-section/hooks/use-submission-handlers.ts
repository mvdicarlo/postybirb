/**
 * Hook for submission action handlers.
 */

import { SubmissionType } from '@postybirb/types';
import { useCallback, useRef } from 'react';
import postQueueApi from '../../../../api/post-queue.api';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import type { SubmissionRecord } from '../../../../stores/records';
import { useUIStore } from '../../../../stores/ui-store';
import {
    isFileSubmissionsViewState,
    type ViewState,
} from '../../../../types/view-state';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
} from '../../../../utils/notifications';

interface UseSubmissionHandlersProps {
  /** Current view state */
  viewState: ViewState;
  /** All submissions (for finding by ID) */
  allSubmissions: SubmissionRecord[];
  /** Currently selected IDs */
  selectedIds: string[];
}

interface UseSubmissionHandlersResult {
  /** File input ref for creating submissions */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Handle creating a new submission (opens file picker) */
  handleCreateSubmission: () => void;
  /** Handle file selection for new submission */
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Handle deleting a submission */
  handleDelete: (id: string) => Promise<void>;
  /** Handle duplicating a submission */
  handleDuplicate: (id: string) => Promise<void>;
  /** Handle editing a submission (select it) */
  handleEdit: (id: string) => void;
  /** Handle changing the submission title */
  handleTitleChange: (id: string, title: string) => Promise<void>;
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle scheduling a submission */
  handleSchedule: (id: string) => void;
}

/**
 * Hook for handling submission actions like delete, duplicate, edit, etc.
 */
export function useSubmissionHandlers({
  viewState,
  allSubmissions,
  selectedIds,
}: UseSubmissionHandlersProps): UseSubmissionHandlersResult {
  const setViewState = useUIStore((state) => state.setViewState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle creating a new submission
  const handleCreateSubmission = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection for new submission
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      if (!files || files.length === 0) return;

      try {
        await submissionApi.createFileSubmission(
          SubmissionType.FILE,
          Array.from(files)
        );
      } catch {
        // Error handling could be added here
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  // Handle deleting a submission
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await submissionApi.remove([id]);
        showDeletedNotification(1);

        // Remove from selection if selected
        if (isFileSubmissionsViewState(viewState) && selectedIds.includes(id)) {
          setViewState({
            ...viewState,
            params: {
              ...viewState.params,
              selectedIds: selectedIds.filter((sid) => sid !== id),
            },
          });
        }
      } catch {
        showDeleteErrorNotification();
      }
    },
    [viewState, selectedIds, setViewState]
  );

  // Handle duplicating a submission
  const handleDuplicate = useCallback(async (id: string) => {
    try {
      await submissionApi.duplicate(id);
    } catch {
      // Error handling could be added here
    }
  }, []);

  // Handle editing a submission (select it)
  const handleEdit = useCallback(
    (id: string) => {
      if (!isFileSubmissionsViewState(viewState)) return;
      setViewState({
        ...viewState,
        params: {
          ...viewState.params,
          selectedIds: [id],
          mode: 'single',
        },
      });
    },
    [viewState, setViewState]
  );

  // Handle changing the submission title
  const handleTitleChange = useCallback(
    async (id: string, title: string) => {
      const submission = allSubmissions.find((s) => s.id === id);
      if (!submission) return;

      const defaultOptions = submission.getDefaultOptions();
      if (!defaultOptions) return;

      try {
        await websiteOptionsApi.update(defaultOptions.id, {
          data: {
            ...defaultOptions.data,
            title,
          },
        });
      } catch {
        // Error handling could be added here
      }
    },
    [allSubmissions]
  );

  // Handle posting a submission
  const handlePost = useCallback(async (id: string) => {
    try {
      await postQueueApi.enqueue([id]);
    } catch {
      // Error handling could be added here
    }
  }, []);

  // Handle scheduling a submission
  const handleSchedule = useCallback(
    (id: string) => {
      // For now, just select the submission - the schedule UI will be in the main panel
      if (!isFileSubmissionsViewState(viewState)) return;
      setViewState({
        ...viewState,
        params: {
          ...viewState.params,
          selectedIds: [id],
          mode: 'single',
        },
      });
      // TODO: Open schedule modal or panel
    },
    [viewState, setViewState]
  );

  return {
    fileInputRef,
    handleCreateSubmission,
    handleFileChange,
    handleDelete,
    handleDuplicate,
    handleEdit,
    handleTitleChange,
    handlePost,
    handleSchedule,
  };
}
