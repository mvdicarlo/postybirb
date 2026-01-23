/**
 * Hook for submission creation handlers (file upload, message creation).
 */

import {
  Description,
  IFileMetadata,
  SubmissionId,
  SubmissionRating,
  SubmissionType,
  Tag,
} from '@postybirb/types';
import { useCallback, useRef, useState } from 'react';
import submissionApi from '../../../../api/submission.api';
import { showErrorNotification } from '../../../../utils/notifications';

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

interface UseSubmissionCreateProps {
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
}

interface UseSubmissionCreateResult {
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
}

/**
 * Hook for handling submission creation.
 */
export function useSubmissionCreate({
  submissionType,
}: UseSubmissionCreateProps): UseSubmissionCreateResult {
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
  const handleCreateMessageSubmission = useCallback(async (title: string) => {
    try {
      await submissionApi.create({
        type: SubmissionType.MESSAGE,
        // Backend data value - not UI text
        // eslint-disable-next-line lingui/no-unlocalized-strings
        name: title || 'New Message',
      });
    } catch {
      showErrorNotification();
    }
  }, []);

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
        showErrorNotification();
      }

      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
  };
}
