/**
 * FileSubmissionsSection - Section panel content for file submissions view.
 * Displays a scrollable list of file submissions with filtering.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Divider, Loader, ScrollArea, Stack, Text } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { useCallback, useMemo, useRef } from 'react';
import postQueueApi from '../../../api/post-queue.api';
import submissionApi from '../../../api/submission.api';
import websiteOptionsApi from '../../../api/website-options.api';
import {
    useSubmissionsByType,
    useSubmissionsLoading,
} from '../../../stores/submission-store';
import { useFileSubmissionsFilter, useUIStore } from '../../../stores/ui-store';
import {
    isFileSubmissionsViewState,
    type ViewState,
} from '../../../types/view-state';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
} from '../../../utils/notifications';
import { FileSubmissionCard } from './file-submission-card';
import { FileSubmissionSectionHeader } from './file-submission-section-header';

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
  const fileSubmissions = useSubmissionsByType(SubmissionType.FILE);
  const { isLoading } = useSubmissionsLoading();
  const { filter, searchQuery } = useFileSubmissionsFilter();
  const setViewState = useUIStore((state) => state.setViewState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get selected IDs from view state
  const selectedIds = isFileSubmissionsViewState(viewState)
    ? viewState.params.selectedIds
    : [];

  // Filter submissions based on search query and filter
  const filteredSubmissions = useMemo(() => {
    let result = fileSubmissions.filter(
      (s) => !s.isTemplate && !s.isMultiSubmission && !s.isArchived,
    );

    // Apply status filter
    switch (filter) {
      case 'drafts':
        result = result.filter((s) => !s.isScheduled && !s.isQueued);
        break;
      case 'scheduled':
        result = result.filter((s) => s.isScheduled);
        break;
      case 'posted':
        result = result.filter((s) => s.isArchived);
        break;
      case 'failed':
        result = result.filter((s) => s.hasErrors);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(query));
    }

    return result;
  }, [fileSubmissions, filter, searchQuery]);

  // Handle selecting a submission
  const handleSelect = (id: string, event: React.MouseEvent) => {
    if (!isFileSubmissionsViewState(viewState)) return;

    let newSelectedIds: string[];

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Cmd click
      if (selectedIds.includes(id)) {
        newSelectedIds = selectedIds.filter((sid) => sid !== id);
      } else {
        newSelectedIds = [...selectedIds, id];
      }
    } else {
      // Single selection
      newSelectedIds = [id];
    }

    setViewState({
      ...viewState,
      params: {
        ...viewState.params,
        selectedIds: newSelectedIds,
        mode: newSelectedIds.length > 1 ? 'multi' : 'single',
      },
    });
  };

  // Handle deleting a submission
  const handleDelete = async (id: string) => {
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
  };

  // Handle duplicating a submission
  const handleDuplicate = async (id: string) => {
    try {
      await submissionApi.duplicate(id);
    } catch {
      // Error handling could be added here
    }
  };

  // Handle editing a submission (select it)
  const handleEdit = (id: string) => {
    if (!isFileSubmissionsViewState(viewState)) return;
    setViewState({
      ...viewState,
      params: {
        ...viewState.params,
        selectedIds: [id],
        mode: 'single',
      },
    });
  };

  // Handle changing the submission title
  const handleTitleChange = useCallback(
    async (id: string, title: string) => {
      const submission = fileSubmissions.find((s) => s.id === id);
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
    [fileSubmissions],
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
    [viewState, setViewState],
  );

  // Handle creating a new submission
  const handleCreateSubmission = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection for new submission
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
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
  };

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
      />

      <Divider />

      {/* Scrollable submission list */}
      <ScrollArea style={{ flex: 1 }} type="hover" scrollbarSize={6}>
        {isLoading ? (
          <Box p="md" ta="center">
            <Loader size="sm" />
          </Box>
        ) : filteredSubmissions.length === 0 ? (
          <Box p="md" ta="center">
            <Text size="sm" c="dimmed">
              <Trans>No submissions found</Trans>
            </Text>
          </Box>
        ) : (
          <Stack gap="0">
            {filteredSubmissions.map((submission) => (
              <FileSubmissionCard
                key={submission.id}
                submission={submission}
                isSelected={selectedIds.includes(submission.id)}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
                onTitleChange={handleTitleChange}
                onPost={handlePost}
                onSchedule={handleSchedule}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}
