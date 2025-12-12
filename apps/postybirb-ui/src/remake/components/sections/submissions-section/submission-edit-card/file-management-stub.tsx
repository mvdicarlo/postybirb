/**
 * FileManagementStub - Placeholder for file management section.
 * Only shown for FILE submissions that are not multi-submissions or templates.
 */

import { Trans } from '@lingui/react/macro';
import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconFileUpload } from '@tabler/icons-react';

/**
 * Stub component for file management section.
 * Will be replaced with actual file management functionality.
 */
export function FileManagementStub() {
  return (
    <Card withBorder radius="sm" p="md">
      <Group gap="md" wrap="nowrap" align="flex-start">
        <ThemeIcon size={40} radius="md" variant="light" color="gray">
          <IconFileUpload size={20} />
        </ThemeIcon>
        <Stack gap={4}>
          <Text fw={600} size="sm">
            <Trans>File Management</Trans>
          </Text>
          <Text size="xs" c="dimmed">
            <Trans>
              File upload, reordering, and editing will be available here.
            </Trans>
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
