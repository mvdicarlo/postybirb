/**
 * SubmissionsSection - Section panel content for submissions view.
 * Displays a scrollable list of submissions with filtering.
 * Works for both FILE and MESSAGE submission types.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Box, Tabs } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionType } from '@postybirb/types';
import { IconArchive, IconFiles, IconMessage } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { tinykeys } from 'tinykeys';
import {
    DeleteSelectedKeybinding,
    toTinykeysFormat,
} from '../../../config/keybindings';
import { useSubmissionsLoading } from '../../../stores/submission-store';
import { ConfirmActionModal } from '../../confirm-action-modal';
import { ArchivedSubmissionList } from './archived-submission-list';
import { SubmissionsProvider } from './context';
import { FileSubmissionModal } from './file-submission-modal';
import {
    useGlobalDropzone,
    useSubmissionHandlers,
    useSubmissions,
    useSubmissionSelection,
    useSubmissionSortable,
} from './hooks';
import { SubmissionList } from './submission-list';
import { SubmissionSectionHeader } from './submission-section-header';
import './submissions-section.css';
import type { SubmissionsSectionProps } from './types';

/** Tab values for submissions view */
type SubmissionTab = 'submissions' | 'archived';

/**
 * Section panel content for the submissions view.
 * Displays a scrollable list of submissions with search and filter.
 */
export function SubmissionsSection({
  viewState,
  submissionType,
}: SubmissionsSectionProps) {
  const { isLoading } = useSubmissionsLoading();
  const { t } = useLingui();

  // Current tab state
  const [activeTab, setActiveTab] = useState<SubmissionTab>('submissions');

  // Get filtered and ordered submissions
  const {
    allSubmissions,
    orderedSubmissions,
    setOrderedSubmissions,
    isDragEnabled,
  } = useSubmissions({ submissionType });

  // Selection management
  const { selectedIds, selectionState, handleSelect, handleToggleSelectAll } =
    useSubmissionSelection({
      viewState,
      orderedSubmissions,
    });

  // Sortable drag-and-drop
  const { containerRef } = useSubmissionSortable({
    isDragEnabled,
    orderedSubmissions,
    setOrderedSubmissions,
  });

  // Action handlers
  const {
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
  } = useSubmissionHandlers({
    viewState,
    allSubmissions,
    selectedIds,
    submissionType,
  });

  // Global dropzone - opens modal when files are dragged into the window
  useGlobalDropzone({
    isOpen: isFileModalOpen,
    onOpen: openFileModal,
    enabled: submissionType === SubmissionType.FILE,
  });

  // Delete confirmation modal
  const [deleteModalOpened, deleteModal] = useDisclosure(false);

  // Post confirmation modal
  const [postModalOpened, postModal] = useDisclosure(false);

  // Count of valid submissions that can be posted
  // (must have website options and no validation errors)
  const validPostCount = useMemo(
    () =>
      selectedIds.filter((id) => {
        const submission = allSubmissions.find((s) => s.id === id);
        if (!submission) return false;
        return submission.hasWebsiteOptions && !submission.hasErrors;
      }).length,
    [selectedIds, allSubmissions],
  );

  // Handle delete with confirmation
  const handleDeleteWithConfirm = useCallback(() => {
    if (selectedIds.length > 0) {
      deleteModal.open();
    }
  }, [selectedIds.length, deleteModal]);

  // Handle post with confirmation (only if there are valid submissions)
  const handlePostWithConfirm = useCallback(() => {
    if (validPostCount > 0) {
      postModal.open();
    }
  }, [validPostCount, postModal]);

  // Delete key handler
  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      [toTinykeysFormat(DeleteSelectedKeybinding)]: (event: KeyboardEvent) => {
        // Don't trigger if user is typing in an input
        const { activeElement } = document;
        if (
          activeElement?.tagName === 'INPUT' ||
          activeElement?.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement)?.isContentEditable
        ) {
          return;
        }

        // Only trigger if items are selected
        if (selectedIds.length > 0) {
          event.preventDefault();
          deleteModal.open();
        }
      },
    });

    return unsubscribe;
  }, [selectedIds.length, deleteModal]);

  // Get the appropriate icon for the submissions tab
  const SubmissionsIcon =
    submissionType === SubmissionType.FILE ? IconFiles : IconMessage;

  return (
    <Box h="100%" className="postybirb__submission__section">
      {/* Delete confirmation modal */}
      <ConfirmActionModal
        opened={deleteModalOpened}
        onClose={deleteModal.close}
        onConfirm={handleDeleteSelected}
        title={<Trans>Delete Submissions</Trans>}
        message={
          <Trans>
            Are you sure you want to delete {selectedIds.length} submission(s)?
            This action cannot be undone.
          </Trans>
        }
        confirmLabel={<Trans>Delete</Trans>}
        confirmColor="red"
      />

      {/* Post confirmation modal */}
      <ConfirmActionModal
        opened={postModalOpened}
        onClose={postModal.close}
        onConfirm={handlePostSelected}
        title={<Trans>Post Submissions</Trans>}
        message={
          validPostCount < selectedIds.length ? (
            <Trans>
              {validPostCount} of {selectedIds.length} selected submission(s)
              are ready to post. Submissions without websites or with validation
              errors will be skipped.
            </Trans>
          ) : (
            <Trans>
              Are you sure you want to post {validPostCount} submission(s)?
            </Trans>
          )
        }
        confirmLabel={<Trans>Post</Trans>}
        confirmColor="blue"
      />

      {/* File submission modal */}
      {submissionType === SubmissionType.FILE && (
        <FileSubmissionModal
          opened={isFileModalOpen}
          onClose={closeFileModal}
          onUpload={handleFileUpload}
          type={submissionType}
        />
      )}

      {/* Hidden file input for creating file submissions (legacy fallback) */}
      {submissionType === SubmissionType.FILE && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="postybirb__submission__file_input"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*,.gif,.webp,.png,.jpg,.jpeg,.pdf,.txt,.doc,.docx"
        />
      )}

      {/* Sticky header */}
      <SubmissionSectionHeader
        submissionType={submissionType}
        onCreateSubmission={handleCreateSubmission}
        onCreateMessageSubmission={handleCreateMessageSubmission}
        selectionState={selectionState}
        onToggleSelectAll={handleToggleSelectAll}
        selectedCount={selectedIds.length}
        totalCount={orderedSubmissions.length}
        onDeleteSelected={handleDeleteWithConfirm}
        onPostSelected={handlePostWithConfirm}
      />

      {/* Tabs for Submissions / Archived */}
      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value as SubmissionTab)}
        className="postybirb__submission__tabs"
      >
        <Tabs.List grow>
          <Tabs.Tab
            value="submissions"
            leftSection={<SubmissionsIcon size={14} />}
          >
            {t`Submissions`}
          </Tabs.Tab>
          <Tabs.Tab value="archived" leftSection={<IconArchive size={14} />}>
            {t`Archived`}
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Tab content */}
      {activeTab === 'submissions' ? (
        <SubmissionsProvider
          submissionType={submissionType}
          selectedIds={selectedIds}
          isDragEnabled={isDragEnabled}
          onSelect={handleSelect}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onPost={handlePost}
          onDefaultOptionChange={handleDefaultOptionChange}
          onScheduleChange={handleScheduleChange}
        >
          <SubmissionList
            isLoading={isLoading}
            submissions={orderedSubmissions}
            containerRef={containerRef}
          />
        </SubmissionsProvider>
      ) : (
        <ArchivedSubmissionList />
      )}
    </Box>
  );
}
