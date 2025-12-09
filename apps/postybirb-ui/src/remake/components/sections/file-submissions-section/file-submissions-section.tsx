/**
 * FileSubmissionsSection - Section panel content for file submissions view.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Text } from '@mantine/core';
import { isFileSubmissionsViewState, type ViewState } from '../../../types/view-state';

interface FileSubmissionsSectionProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Section panel content for the file submissions view.
 * Displays a list of file submissions.
 */
export function FileSubmissionsSection({ viewState }: FileSubmissionsSectionProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>File Submissions List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isFileSubmissionsViewState(viewState) ? viewState.params.selectedIds.length : 0} items
      </Text>
    </Box>
  );
}
