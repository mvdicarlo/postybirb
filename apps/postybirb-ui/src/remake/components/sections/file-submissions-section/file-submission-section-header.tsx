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
    SegmentedControl,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
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
