/**
 * MessageSubmissionsPage - Page for managing message submissions.
 * Stub implementation to be filled in later.
 */

import { Trans } from '@lingui/react/macro';
import { Stack, Text, Title } from '@mantine/core';

/**
 * Message submissions page component.
 */
export function MessageSubmissionsPage() {
  return (
    <Stack gap="md">
      <Title order={2}>
        <Trans>Send Messages</Trans>
      </Title>
      <Text c="dimmed">
        <Trans>Message submissions will be displayed here.</Trans>
      </Text>
    </Stack>
  );
}
