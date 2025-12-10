/**
 * FileSubmissionSectionHeader - Sticky header for file submissions section panel.
 * Contains title, create button, and search/filter controls.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  ActionIcon,
  Box,
  Checkbox,
  Group,
  Kbd,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconSend, IconTrash } from '@tabler/icons-react';
import { DeleteSelectedKeybinding } from '../../../config/keybindings';
import type { SubmissionFilter } from '../../../stores/ui-store';
import { useFileSubmissionsFilter } from '../../../stores/ui-store';
import { SearchInput } from '../../shared';

/** Selection state for the checkbox */
export type SelectionState = 'none' | 'partial' | 'all';

interface FileSubmissionSectionHeaderProps {
  /** Handler for creating a new submission */
  onCreateSubmission?: () => void;
  /** Current selection state */
  selectionState?: SelectionState;
  /** Handler for toggling select all/none */
  onToggleSelectAll?: () => void;
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
 * Sticky header for the file submissions section panel.
 * Provides title, create button, and search/filter functionality.
 */
export function FileSubmissionSectionHeader({
  onCreateSubmission,
  selectionState = 'none',
  onToggleSelectAll,
  selectedCount = 0,
  totalCount = 0,
  onDeleteSelected,
  onPostSelected,
}: FileSubmissionSectionHeaderProps) {
  const {
    filter,
    searchQuery,
    setFilter,
    setSearchQuery,
  } = useFileSubmissionsFilter();
  const { t } = useLingui();

  return (
    <Box
      p="sm"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--mantine-color-body)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
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
                <Trans>File Submissions</Trans>
              )}
            </Text>
          </Group>
          <Group gap="xs">
            {/* Mass post button - only show when items are selected */}
            {selectedCount > 0 && onPostSelected && (
              <Tooltip label={<Trans>Post selected</Trans>}>
                <ActionIcon
                  onClick={onPostSelected}
                  variant="light"
                  size="sm"
                  // eslint-disable-next-line lingui/no-unlocalized-strings
                  aria-label="Post selected submissions"
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
                    <Trans>Delete selected</Trans>
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
                  aria-label="Delete selected submissions"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {onCreateSubmission && (
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
    </Box>
  );
}
