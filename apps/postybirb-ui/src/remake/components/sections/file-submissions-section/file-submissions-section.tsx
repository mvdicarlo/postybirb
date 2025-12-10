/**
 * FileSubmissionsSection - Section panel content for file submissions view.
 * Displays a scrollable list of file submissions with filtering.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Divider } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useEffect, useMemo } from 'react';
import { tinykeys } from 'tinykeys';
import { DeleteSelectedKeybinding, toTinykeysFormat } from '../../../config/keybindings';
import { useSubmissionsLoading } from '../../../stores/submission-store';
import type { ViewState } from '../../../types/view-state';
import { ConfirmActionModal } from '../../confirm-action-modal';
import { FileSubmissionList } from './file-submission-list';
import { FileSubmissionSectionHeader } from './file-submission-section-header';
import {
    useFileSubmissions,
    useSubmissionHandlers,
    useSubmissionSelection,
    useSubmissionSortable,
} from './hooks';

interface FileSubmissionsSectionProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Section panel content for the file submissions view.
 * Displays a scrollable list of file submissions with search and filter.
 */
export function FileSubmissionsSection({
  viewState,
}: FileSubmissionsSectionProps) {
  const { isLoading } = useSubmissionsLoading();

  // Get filtered and ordered submissions
  const {
    allSubmissions,
    orderedSubmissions,
    setOrderedSubmissions,
    isDragEnabled,
  } = useFileSubmissions();

  // Selection management
  const {
    selectedIds,
    selectionState,
    handleSelect,
    handleToggleSelectAll,
  } = useSubmissionSelection({
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
    handleCreateSubmission,
    handleFileChange,
    handleDelete,
    handleDeleteSelected,
    handleDuplicate,
    handleEdit,
    handleTitleChange,
    handlePost,
    handlePostSelected,
    handleSchedule,
  } = useSubmissionHandlers({
    viewState,
    allSubmissions,
    selectedIds,
  });

  // Delete confirmation modal
  const [deleteModalOpened, deleteModal] = useDisclosure(false);

  // Post confirmation modal
  const [postModalOpened, postModal] = useDisclosure(false);

  // Count of valid submissions that can be posted
  // (must have website options and no validation errors)
  const validPostCount = useMemo(() => {
    return selectedIds.filter((id) => {
      const submission = allSubmissions.find((s) => s.id === id);
      if (!submission) return false;
      return submission.hasWebsiteOptions && !submission.hasErrors;
    }).length;
  }, [selectedIds, allSubmissions]);

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
        const activeElement = document.activeElement;
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

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
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

      {/* Hidden file input for creating submissions */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,video/*,audio/*,.gif,.webp,.png,.jpg,.jpeg,.pdf,.txt,.doc,.docx"
      />

      {/* Sticky header */}
      <FileSubmissionSectionHeader
        onCreateSubmission={handleCreateSubmission}
        selectionState={selectionState}
        onToggleSelectAll={handleToggleSelectAll}
        selectedCount={selectedIds.length}
        totalCount={orderedSubmissions.length}
        onDeleteSelected={handleDeleteWithConfirm}
        onPostSelected={handlePostWithConfirm}
      />

      <Divider />

      {/* Scrollable submission list */}
      <FileSubmissionList
        isLoading={isLoading}
        submissions={orderedSubmissions}
        selectedIds={selectedIds}
        isDragEnabled={isDragEnabled}
        containerRef={containerRef}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onEdit={handleEdit}
        onTitleChange={handleTitleChange}
        onPost={handlePost}
        onSchedule={handleSchedule}
      />
    </Box>
  );
}
