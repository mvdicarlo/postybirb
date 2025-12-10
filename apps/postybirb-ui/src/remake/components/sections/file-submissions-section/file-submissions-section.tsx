/**
 * FileSubmissionsSection - Section panel content for file submissions view.
 * Displays a scrollable list of file submissions with filtering.
 */

import { Box, Divider } from '@mantine/core';
import { useSubmissionsLoading } from '../../../stores/submission-store';
import type { ViewState } from '../../../types/view-state';
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
    handleDuplicate,
    handleEdit,
    handleTitleChange,
    handlePost,
    handleSchedule,
  } = useSubmissionHandlers({
    viewState,
    allSubmissions,
    selectedIds,
  });

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
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
