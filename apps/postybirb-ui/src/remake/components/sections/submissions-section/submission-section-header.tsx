/**
 * SubmissionSectionHeader - Sticky header for submissions section panel.
 * Contains title, create button, and search/filter controls.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Box,
  Button,
  Checkbox,
  Group,
  Kbd,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { SubmissionId, SubmissionType } from '@postybirb/types';
import { IconPlus, IconSend, IconTemplate, IconTrash } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { DeleteSelectedKeybinding } from '../../../config/keybindings';
import type { SubmissionFilter } from '../../../stores/ui-store';
import { useSubmissionsFilter } from '../../../stores/ui-store';
import { SearchInput } from '../../shared';
import { TemplatePickerModal } from '../../shared/template-picker';
import './submissions-section.css';

/** Selection state for the checkbox */
export type SelectionState = 'none' | 'partial' | 'all';

interface SubmissionSectionHeaderProps {
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
  /** Handler for creating a new file submission (opens file picker) */
  onCreateSubmission?: () => void;
  /** Handler for creating a new message submission with title */
  onCreateMessageSubmission?: (title: string) => void;
  /** Current selection state */
  selectionState?: SelectionState;
  /** Handler for toggling select all/none */
  onToggleSelectAll?: () => void;
  /** Currently selected submission IDs */
  selectedIds?: SubmissionId[];
  /** Number of selected items */
  selectedCount?: number;
  /** Total number of items */
  totalCount?: number;
  /** Handler for deleting selected submissions */
  onDeleteSelected?: () => void;
  /** Handler for posting selected submissions */
  onPostSelected?: () => void;
}

/**
 * Sticky header for the submissions section panel.
 * Provides title, create button, and search/filter functionality.
 */
export function SubmissionSectionHeader({
  submissionType,
  onCreateSubmission,
  onCreateMessageSubmission,
  selectionState = 'none',
  onToggleSelectAll,
  selectedIds = [],
  selectedCount = 0,
  totalCount = 0,
  onDeleteSelected,
  onPostSelected,
}: SubmissionSectionHeaderProps) {
  const { filter, searchQuery, setFilter, setSearchQuery } =
    useSubmissionsFilter(submissionType);
  const { t } = useLingui();

  // Popover state for message submission creation
  const [popoverOpened, popover] = useDisclosure(false);
  const [messageTitle, setMessageTitle] = useState('');
  
  // Template picker modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Handle creating a message submission
  const handleCreateMessage = useCallback(() => {
    if (messageTitle.trim()) {
      onCreateMessageSubmission?.(messageTitle.trim());
      setMessageTitle('');
      popover.close();
    }
  }, [messageTitle, onCreateMessageSubmission, popover]);

  // Handle key press in message title input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateMessage();
      }
      if (e.key === 'Escape') {
        popover.close();
        setMessageTitle('');
      }
    },
    [handleCreateMessage, popover],
  );

  const isFileType = submissionType === SubmissionType.FILE;
  const headerTitle = isFileType ? (
    <Trans>File Submissions</Trans>
  ) : (
    <Trans>Message Submissions</Trans>
  );

  return (
    <Box p="sm" className="postybirb__submission__header">
      <Stack gap="xs">
        {/* Title row with select all checkbox and create button */}
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Tooltip
              label={
                selectionState === 'all' ? (
                  <Trans>Deselect all</Trans>
                ) : (
                  <Trans>Select all</Trans>
                )
              }
            >
              <Checkbox
                size="xs"
                checked={selectionState === 'all'}
                indeterminate={selectionState === 'partial'}
                onChange={onToggleSelectAll}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                aria-label="Select all submissions"
              />
            </Tooltip>
            <Text fw={600} size="sm">
              {selectedCount > 0 ? (
                <Trans>
                  {selectedCount} of {totalCount} selected
                </Trans>
              ) : (
                headerTitle
              )}
            </Text>
          </Group>
          <Group gap="xs">
            {/* Apply template button - only show when items are selected */}
            {selectedCount > 0 && (
              <Tooltip label={<Trans>Apply template</Trans>}>
                <ActionIcon
                  onClick={() => setIsTemplateModalOpen(true)}
                  variant="light"
                  size="sm"
                  color="grape"
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label="Apply template"
                >
                  <IconTemplate size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {/* Mass post button - only show when items are selected */}
            {selectedCount > 0 && onPostSelected && (
              <Tooltip label={<Trans>Post</Trans>}>
                <ActionIcon
                  onClick={onPostSelected}
                  variant="light"
                  size="sm"
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label="Post"
                >
                  <IconSend size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {/* Mass delete button - only show when items are selected */}
            {selectedCount > 0 && onDeleteSelected && (
              <Tooltip
                label={
                  <Group gap="xs">
                    <Trans>Delete</Trans>
                    <Kbd size="xs">{DeleteSelectedKeybinding}</Kbd>
                  </Group>
                }
              >
                <ActionIcon
                  onClick={onDeleteSelected}
                  variant="light"
                  size="sm"
                  color="red"
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label="Delete"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}

            {/* Create button - different behavior for FILE vs MESSAGE */}
            {isFileType ? (
              // FILE type: opens file picker
              onCreateSubmission && (
                <Tooltip label={<Trans>Create Submission</Trans>}>
                  <ActionIcon
                    variant="light"
                    size="sm"
                    onClick={onCreateSubmission}
                    // eslint-disable-next-line lingui/no-unlocalized-strings
                    aria-label="Create submission"
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
              )
            ) : (
              // MESSAGE type: opens popover with title input
              <Popover
                opened={popoverOpened}
                onClose={popover.close}
                position="bottom-end"
                withArrow
              >
                <Popover.Target>
                  <Tooltip label={<Trans>Create Message</Trans>}>
                    <ActionIcon
                      variant="light"
                      size="sm"
                      onClick={popover.toggle}
                      // eslint-disable-next-line lingui/no-unlocalized-strings
                      aria-label="Create message submission"
                    >
                      <IconPlus size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      <Trans>New Message</Trans>
                    </Text>
                    <TextInput
                      size="xs"
                      placeholder={t`Enter title...`}
                      value={messageTitle}
                      onChange={(e) => setMessageTitle(e.currentTarget.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <Button
                      size="xs"
                      onClick={handleCreateMessage}
                      disabled={!messageTitle.trim()}
                    >
                      <Trans>Create</Trans>
                    </Button>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            )}
          </Group>
        </Group>

        {/* Search input */}
        <SearchInput
          size="xs"
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Status filter */}
        <SegmentedControl
          size="xs"
          fullWidth
          value={filter}
          onChange={(value) => setFilter(value as SubmissionFilter)}
          data={[
            { value: 'all', label: t`All` },
            { value: 'drafts', label: t`Drafts` },
            { value: 'scheduled', label: t`Scheduled` },
          ]}
        />
      </Stack>

      {/* Template picker modal for mass apply */}
      {isTemplateModalOpen && selectedIds.length > 0 && (
        <TemplatePickerModal
          targetSubmissionIds={selectedIds}
          type={submissionType}
          onClose={() => setIsTemplateModalOpen(false)}
        />
      )}
    </Box>
  );
}
