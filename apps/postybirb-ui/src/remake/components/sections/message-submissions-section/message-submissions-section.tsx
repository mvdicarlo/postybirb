/**
 * MessageSubmissionsSection - Section panel content for message submissions view.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Text } from '@mantine/core';
import { isMessageSubmissionsViewState, type ViewState } from '../../../types/view-state';

interface MessageSubmissionsSectionProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Section panel content for the message submissions view.
 * Displays a list of message submissions.
 */
export function MessageSubmissionsSection({ viewState }: MessageSubmissionsSectionProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>Message Submissions List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isMessageSubmissionsViewState(viewState) ? viewState.params.selectedIds.length : 0} items
      </Text>
    </Box>
  );
}
