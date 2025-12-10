/**
 * ArchivedFileSubmissionList - Stub component for archived file submissions.
 * TODO: Implement full functionality for viewing/managing archived submissions.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Text } from '@mantine/core';
import { IconArchive } from '@tabler/icons-react';
import './file-submissions-section.css';

/**
 * Placeholder component for the archived submissions list.
 * Will be fully implemented later.
 */
export function ArchivedFileSubmissionList() {
  return (
    <Box className="postybirb__file_submission__archived_placeholder">
      <IconArchive size={48} stroke={1.5} opacity={0.3} />
      <Text size="sm" c="dimmed" ta="center">
        <Trans>Archived submissions will appear here</Trans>
      </Text>
    </Box>
  );
}
