/**
 * Hook for submission action handlers.
 */

import {
    Description,
    IFileMetadata,
    ISubmissionScheduleInfo,
    IWebsiteFormFields,
    SubmissionId,
    SubmissionRating,
    SubmissionType,
    Tag,
} from '@postybirb/types';
import { useCallback, useRef, useState } from 'react';
import postQueueApi from '../../../../api/post-queue.api';
import submissionApi from '../../../../api/submission.api';
import websiteOptionsApi from '../../../../api/website-options.api';
import type { SubmissionRecord } from '../../../../stores/records';
import { useUIStore } from '../../../../stores/ui-store';
import {
    FileSubmissionsViewState,
    isFileSubmissionsViewState,
    isMessageSubmissionsViewState,
    MessageSubmissionsViewState,
    type ViewState,
} from '../../../../types/view-state';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
} from '../../../../utils/notifications';

/** Union type for submission view states */
type SubmissionsViewState = FileSubmissionsViewState | MessageSubmissionsViewState;

interface UseSubmissionHandlersProps {
  /** Current view state */
  viewState: ViewState;
  /** All submissions (for finding by ID) */
  allSubmissions: SubmissionRecord[];
  /** Currently selected IDs */
  selectedIds: string[];
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
}

/**
 * Parameters for file submission upload.
 */
export interface FileSubmissionUploadParams {
  files: File[];
  fileMetadata: IFileMetadata[];
  defaultOptions: {
    tags?: Tag[];
    description?: Description;
    rating?: SubmissionRating;
  };
  templateId?: SubmissionId;
}

interface UseSubmissionHandlersResult {
  /** File input ref for creating file submissions (legacy fallback) */
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Whether the file submission modal is open */
  isFileModalOpen: boolean;
  /** Open the file submission modal */
  openFileModal: () => void;
  /** Close the file submission modal */
  closeFileModal: () => void;
  /** Handle uploading files from the modal */
  handleFileUpload: (params: FileSubmissionUploadParams) => Promise<void>;
  /** Handle creating a new submission (opens modal for FILE, handled by header for MESSAGE) */
  handleCreateSubmission: () => void;
  /** Handle creating a message submission with a title */
  handleCreateMessageSubmission: (title: string) => Promise<void>;
  /** Handle file selection for new file submission (legacy/fallback) */
  handleFileChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void>;
  /** Handle deleting a submission */
  handleDelete: (id: string) => Promise<void>;
  /** Handle deleting all selected submissions */
  handleDeleteSelected: () => Promise<void>;
  /** Handle posting all selected submissions */
  handlePostSelected: () => Promise<void>;
  /** Handle duplicating a submission */
  handleDuplicate: (id: string) => Promise<void>;
  /** Handle editing a submission (select it) */
  handleEdit: (id: string) => void;
  /** Handle changing a default option field (title, tags, rating, etc.) */
  handleDefaultOptionChange: (
    id: string,
    update: Partial<IWebsiteFormFields>,
  ) => Promise<void>;
  /** Handle posting a submission */
  handlePost: (id: string) => Promise<void>;
  /** Handle schedule changes */
  handleScheduleChange: (
    id: string,
    schedule: ISubmissionScheduleInfo,
    isScheduled: boolean,
  ) => Promise<void>;
}

/**
 * Check if view state is a submissions view state (FILE or MESSAGE).
 * Uses a type predicate for proper type narrowing.
 */
function isSubmissionsViewState(viewState: ViewState): viewState is SubmissionsViewState {
  return (
    isFileSubmissionsViewState(viewState) ||
    isMessageSubmissionsViewState(viewState)
  );
}

/**
 * Hook for handling submission actions like delete, duplicate, edit, etc.
 */
export function useSubmissionHandlers({
  viewState,
  allSubmissions,
  selectedIds,
  submissionType,
}: UseSubmissionHandlersProps): UseSubmissionHandlersResult {
  const setViewState = useUIStore((state) => state.setViewState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File submission modal state
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

  const openFileModal = useCallback(() => setIsFileModalOpen(true), []);
  const closeFileModal = useCallback(() => setIsFileModalOpen(false), []);

  // Handle uploading files from the modal
  const handleFileUpload = useCallback(
    async (params: FileSubmissionUploadParams) => {
      const { files, fileMetadata, defaultOptions, templateId } = params;

      // Convert Description to DescriptionValue for the API
      const apiDefaultOptions = defaultOptions
        ? {
            tags: defaultOptions.tags,
            rating: defaultOptions.rating,
            description: defaultOptions.description
              ? {
                  overrideDefault: false,
                  description: defaultOptions.description,
                  insertTags: undefined,
                  insertTitle: undefined,
                }
              : undefined,
          }
        : undefined;

      // Create file submissions with metadata and default options
      const response = await submissionApi.createFileSubmission({
        type: SubmissionType.FILE,
        files,
        fileMetadata,
        defaultOptions: apiDefaultOptions,
      });

      // Apply template if selected
      if (templateId && response.body) {
        const submissions = Array.isArray(response.body)
          ? response.body
          : [response.body];
        await Promise.all(
          submissions.map((sub: { id: SubmissionId }) =>
            submissionApi.applyTemplate(sub.id, templateId),
          ),
        );
      }
    },
    [],
  );

  // Handle creating a new submission
  const handleCreateSubmission = useCallback(() => {
    if (submissionType === SubmissionType.FILE) {
      // Open the file submission modal
      openFileModal();
    }
    // For MESSAGE type, the popover handles creation via handleCreateMessageSubmission
  }, [submissionType, openFileModal]);

  // Handle creating a message submission with title
  const handleCreateMessageSubmission = useCallback(
    async (title: string) => {
      try {
        await submissionApi.create({
          type: SubmissionType.MESSAGE,
          // Backend data value - not UI text
          // eslint-disable-next-line lingui/no-unlocalized-strings
          name: title || 'New Message',
        });
      } catch {
        // Error handling could be added here
      }
    },
    [],
  );

  // Handle file selection for new file submission
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const { files } = event.target;
      if (!files || files.length === 0) return;

      try {
        await submissionApi.createFileSubmission(
          SubmissionType.FILE,
          Array.from(files),
        );
      } catch {
        // Error handling could be added here
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [],
  );

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

  // Handle posting all selected submissions
  // Filters out submissions that have no websites or have validation errors
  const handlePostSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;

    // Filter to only include valid submissions:
    // - Must have at least one website option (excluding default)
    // - Must not have validation errors
    const validIds = selectedIds.filter((id) => {
      const submission = allSubmissions.find((s) => s.id === id);
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
      // Error handling could be added here
    }
  }, [selectedIds, allSubmissions, viewState, setViewState]);

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
  const handleDefaultOptionChange = useCallback(
    async (id: string, update: Partial<IWebsiteFormFields>) => {
      const submission = allSubmissions.find((s) => s.id === id);
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
        // Error handling could be added here
      }
    },
    [allSubmissions],
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
  const handleScheduleChange = useCallback(
    async (id: string, schedule: ISubmissionScheduleInfo, isScheduled: boolean) => {
      try {
        await submissionApi.update(id, {
          isScheduled,
          ...schedule,
        });
      } catch {
        // Error handling could be added here
      }
    },
    [],
  );

  return {
    fileInputRef,
    isFileModalOpen,
    openFileModal,
    closeFileModal,
    handleFileUpload,
    handleCreateSubmission,
    handleCreateMessageSubmission,
    handleFileChange,
    handleDelete,
    handleDeleteSelected,
    handleDuplicate,
    handleEdit,
    handleDefaultOptionChange,
    handlePost,
    handlePostSelected,
    handleScheduleChange,
  };
}
