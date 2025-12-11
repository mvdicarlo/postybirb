/**
 * TemplatesContent - Main content area for templates view.
 * Stub implementation for now - will show template editor when implemented.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconTemplate } from '@tabler/icons-react';
import { isTemplatesViewState, type ViewState } from '../../../types/view-state';

interface TemplatesContentProps {
  viewState: ViewState;
}

/**
 * Content area for the templates view.
 * Shows selected template details or empty state.
 */
export function TemplatesContent({ viewState }: TemplatesContentProps) {
  const selectedId = isTemplatesViewState(viewState)
    ? viewState.params.selectedId
    : null;

  return (
    <Box h="100%" p="xl">
      <Stack align="center" justify="center" h="100%" gap="md">
        <ThemeIcon size={80} radius="xl" variant="light" color="gray">
          <IconTemplate size={40} />
        </ThemeIcon>
        {selectedId ? (
          <>
            <Text size="lg" fw={500}>
              <Trans>Template Editor</Trans>
            </Text>
            <Text c="dimmed" ta="center">
              <Trans>Template editing will be implemented here.</Trans>
            </Text>
            <Text size="xs" c="dimmed">
              <Trans>ID: {selectedId}</Trans>
            </Text>
          </>
        ) : (
          <>
            <Text size="lg" fw={500}>
              <Trans>Select a Template</Trans>
            </Text>
            <Text c="dimmed" ta="center">
              <Trans>Select a template from the list to view or edit it.</Trans>
            </Text>
          </>
        )}
      </Stack>
    </Box>
  );
}
