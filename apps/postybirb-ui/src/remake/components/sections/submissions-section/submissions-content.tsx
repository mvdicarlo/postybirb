/**
 * SubmissionsContent - Primary content area for submissions view.
 * Displays submission details when submissions are selected.
 * Works for both FILE and MESSAGE submission types.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Center, Stack, Text, Title } from '@mantine/core';
import { SubmissionType } from '@postybirb/types';
import { IconFile, IconInbox, IconMessage } from '@tabler/icons-react';
import {
    isFileSubmissionsViewState,
    isMessageSubmissionsViewState,
    type ViewState,
} from '../../../types/view-state';

interface SubmissionsContentProps {
  /** Current view state */
  viewState: ViewState;
  /** Type of submissions (FILE or MESSAGE) */
  submissionType: SubmissionType;
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
 * Primary content for the submissions view.
 * Shows submission details when submissions are selected.
 */
export function SubmissionsContent({
  viewState,
  submissionType,
}: SubmissionsContentProps) {
  // Get selected IDs from view state
  let selectedIds: string[] = [];
  let mode = 'single';

  if (
    submissionType === SubmissionType.FILE &&
    isFileSubmissionsViewState(viewState)
  ) {
    selectedIds = viewState.params.selectedIds;
    mode = viewState.params.mode;
  } else if (
    submissionType === SubmissionType.MESSAGE &&
    isMessageSubmissionsViewState(viewState)
  ) {
    selectedIds = viewState.params.selectedIds;
    mode = viewState.params.mode;
  }

  if (selectedIds.length === 0) {
    return <EmptySubmissionSelection />;
  }

  // Choose icon based on submission type
  const Icon = submissionType === SubmissionType.FILE ? IconFile : IconMessage;
  const titleText =
    submissionType === SubmissionType.FILE ? (
      <Trans>File Submission Details</Trans>
    ) : (
      <Trans>Message Submission Details</Trans>
    );

  return (
    <Box p="md">
      <Stack gap="sm">
        <Stack gap="xs">
          <Icon size={32} stroke={1.5} opacity={0.7} />
          <Title order={3}>{titleText}</Title>
        </Stack>
        {/* Debug info - will be replaced with actual content */}
        <Text size="sm" c="dimmed">
          <Trans>Mode:</Trans> {mode} | <Trans>Selected:</Trans>{' '}
          {selectedIds.length}
        </Text>
      </Stack>
    </Box>
  );
}
