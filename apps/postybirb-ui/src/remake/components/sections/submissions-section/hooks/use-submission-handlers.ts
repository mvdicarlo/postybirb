/**
 * Hook for submission action handlers.
 * Composes smaller focused hooks for better maintainability.
 */

import {
  ISubmissionScheduleInfo,
  IWebsiteFormFields,
  SubmissionType,
} from '@postybirb/types';
import type { SubmissionRecord } from '../../../../stores/records';
import { type ViewState } from '../../../../types/view-state';
import {
  FileSubmissionUploadParams,
  useSubmissionCreate,
} from './use-submission-create';
import { useSubmissionDelete } from './use-submission-delete';
import { useSubmissionPost } from './use-submission-post';
import { useSubmissionUpdate } from './use-submission-update';

// Re-export types for convenience
export type { FileSubmissionUploadParams };

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
  /** Handle archiving a submission */
  handleArchive: (id: string) => Promise<void>;
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
 * Hook for handling submission actions like delete, duplicate, edit, etc.
 * Composes useSubmissionCreate, useSubmissionDelete, useSubmissionPost, and useSubmissionUpdate.
 */
export function useSubmissionHandlers({
  viewState,
  allSubmissions,
  selectedIds,
  submissionType,
}: UseSubmissionHandlersProps): UseSubmissionHandlersResult {
  // Compose smaller hooks
  const {
    fileInputRef,
    isFileModalOpen,
    openFileModal,
    closeFileModal,
    handleFileUpload,
    handleCreateSubmission,
    handleCreateMessageSubmission,
    handleFileChange,
  } = useSubmissionCreate({ submissionType });

  const { handleDelete, handleDeleteSelected } = useSubmissionDelete({
    viewState,
    selectedIds,
  });

  const { handlePost, handlePostSelected } = useSubmissionPost({
    viewState,
    allSubmissions,
    selectedIds,
  });

  const {
    handleDuplicate,
    handleArchive,
    handleEdit,
    handleDefaultOptionChange,
    handleScheduleChange,
  } = useSubmissionUpdate({
    viewState,
    allSubmissions,
  });

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
    handleArchive,
    handleEdit,
    handleDefaultOptionChange,
    handlePost,
    handlePostSelected,
    handleScheduleChange,
  };
}

