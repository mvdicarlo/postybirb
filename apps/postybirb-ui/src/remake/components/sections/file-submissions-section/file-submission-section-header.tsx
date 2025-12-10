/**
 * FileSubmissionSectionHeader - Sticky header for file submissions section panel.
 * Contains title, create button, and search/filter controls.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
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

interface FileSubmissionSectionHeaderProps {
  /** Handler for creating a new submission */
  onCreateSubmission?: () => void;
}

/**
 * Sticky header for the file submissions section panel.
 * Provides title, create button, and search/filter functionality.
 */
export function FileSubmissionSectionHeader({
  onCreateSubmission,
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
        {/* Title row with create button */}
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            <Trans>File Submissions</Trans>
          </Text>
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
