/**
 * Hook for submission update handlers (edit, duplicate, archive, schedule, default options).
 */

import { ISubmissionScheduleInfo, IWebsiteFormFields } from '@postybirb/types';
import { useCallback } from 'react';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import { useSubmissionStore } from '../../../../stores/submission-store';
import { useSetViewState } from '../../../../stores/ui-store';
import { type ViewState } from '../../../../types/view-state';
import {
  showDuplicateErrorNotification,
  showErrorNotification,
  showUpdateErrorNotification,
} from '../../../../utils/notifications';
import { isSubmissionsViewState } from '../types';

interface UseSubmissionUpdateProps {
  /** Current view state */
  viewState: ViewState;
}

interface UseSubmissionUpdateResult {
  /** Handle duplicating a submission */
  handleDuplicate: (id: string) => Promise<void>;
  /** Handle archiving a submission */
  handleArchive: (id: string) => Promise<void>;
  /** Handle editing a submission (select it) */
  handleEdit: (id: string) => void;
  /** Handle changing a default option field (title, tags, rating, etc.) */
  handleDefaultOptionChange: (
    id: string,
    update: Partial<IWebsiteFormFields>,
  ) => Promise<void>;
  /** Handle schedule changes */
  handleScheduleChange: (
    id: string,
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean,
  ) => Promise<void>;
}

/**
 * Hook for handling submission updates.
 */
export function useSubmissionUpdate({
  viewState,
}: UseSubmissionUpdateProps): UseSubmissionUpdateResult {
  const setViewState = useSetViewState();

  // Handle duplicating a submission
  const handleDuplicate = useCallback(async (id: string) => {
    try {
      await submissionApi.duplicate(id);
    } catch {
      showDuplicateErrorNotification();
    }
  }, []);

  // Handle archiving a submission
  const handleArchive = useCallback(async (id: string) => {
    try {
      await submissionApi.archive(id);
    } catch {
      showErrorNotification();
    }
  }, []);

  // Handle editing a submission (select it)
  const handleEdit = useCallback(
    (id: string) => {
      if (!isSubmissionsViewState(viewState)) return;
      setViewState({
        ...viewState,
        params: {
          ...viewState.params,
          selectedIds: [id],
          mode: 'single',
        },
      } as ViewState);
    },
    [viewState, setViewState],
  );

  // Handle changing any default option field (title, tags, rating, etc.)
  // Uses getState() to get current submission at call time, avoiding stale closures
  const handleDefaultOptionChange = useCallback(
    async (id: string, update: Partial<IWebsiteFormFields>) => {
      const submission = useSubmissionStore.getState().recordsMap.get(id);
      if (!submission) return;

      const defaultOptions = submission.getDefaultOptions();
      if (!defaultOptions) return;

      try {
        await websiteOptionsApi.update(defaultOptions.id, {
          data: {
            ...defaultOptions.data,
            ...update,
          },
        });
      } catch {
        showUpdateErrorNotification();
      }
    },
    [],
  );

  // Handle scheduling a submission
  const handleScheduleChange = useCallback(
    async (
      id: string,
      schedule: ISubmissionScheduleInfo,
      isScheduled: boolean,
    ) => {
      try {
        await submissionApi.update(id, {
          isScheduled,
          ...schedule,
        });
      } catch {
        showUpdateErrorNotification();
      }
    },
    [],
  );

  return {
    handleDuplicate,
    handleArchive,
    handleEdit,
    handleDefaultOptionChange,
    handleScheduleChange,
  };
}
