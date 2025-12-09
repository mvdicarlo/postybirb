/**
 * FileSubmissionsContent - Primary content area for file submissions view.
 * Displays submission details when submissions are selected.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Center, Stack, Text, Title } from '@mantine/core';
import { IconFile, IconInbox } from '@tabler/icons-react';
import { isFileSubmissionsViewState, type ViewState } from '../../../types/view-state';

interface FileSubmissionsContentProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Empty state when no submission is selected.
 */
function EmptySubmissionSelection() {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconInbox size={64} stroke={1.5} opacity={0.3} />
        <Text size="sm" c="dimmed" ta="center">
          <Trans>Select a submission from the list to view details</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * Primary content for the file submissions view.
 * Shows submission details when submissions are selected.
 */
export function FileSubmissionsContent({ viewState }: FileSubmissionsContentProps) {
  if (!isFileSubmissionsViewState(viewState)) return null;

  const { selectedIds, mode } = viewState.params;

  if (selectedIds.length === 0) {
    return <EmptySubmissionSelection />;
  }

  return (
    <Box p="md">
      <Stack gap="sm">
        <Stack gap="xs">
          <IconFile size={32} stroke={1.5} opacity={0.7} />
          <Title order={3}>
            <Trans>File Submission Details</Trans>
          </Title>
        </Stack>
        <Text size="sm" c="dimmed">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          Mode: {mode} | Selected: {selectedIds.length} items
        </Text>
        <Text size="xs" c="dimmed">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          IDs: {selectedIds.join(', ') || 'none'}
        </Text>
      </Stack>
    </Box>
  );
}
