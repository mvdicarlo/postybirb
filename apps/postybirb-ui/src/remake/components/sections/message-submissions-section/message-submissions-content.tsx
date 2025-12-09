/**
 * MessageSubmissionsContent - Primary content area for message submissions view.
 * Displays submission details when submissions are selected.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Center, Stack, Text, Title } from '@mantine/core';
import { IconInbox, IconMessage } from '@tabler/icons-react';
import { isMessageSubmissionsViewState, type ViewState } from '../../../types/view-state';

interface MessageSubmissionsContentProps {
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
          <Trans>Select a message from the list to view details</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * Primary content for the message submissions view.
 * Shows submission details when submissions are selected.
 */
export function MessageSubmissionsContent({ viewState }: MessageSubmissionsContentProps) {
  if (!isMessageSubmissionsViewState(viewState)) return null;

  const { selectedIds, mode } = viewState.params;

  if (selectedIds.length === 0) {
    return <EmptySubmissionSelection />;
  }

  return (
    <Box p="md">
      <Stack gap="sm">
        <Stack gap="xs">
          <IconMessage size={32} stroke={1.5} opacity={0.7} />
          <Title order={3}>
            <Trans>Message Submission Details</Trans>
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
