/**
 * FileSubmissionsPage - Page for managing file submissions.
 * Stub implementation to be filled in later.
 */

import { Trans } from '@lingui/react/macro';
import { Stack, Text, Title } from '@mantine/core';

/**
 * File submissions page component.
 */
export function FileSubmissionsPage() {
  return (
    <Stack gap="md">
      <Title order={2}>
        <Trans>Post Files</Trans>
      </Title>
      <Text c="dimmed">
        <Trans>File submissions will be displayed here.</Trans>
      </Text>
    </Stack>
  );
}
