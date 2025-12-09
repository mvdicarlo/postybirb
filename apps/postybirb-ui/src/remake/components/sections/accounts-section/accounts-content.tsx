/**
 * AccountsContent - Primary content area for accounts view.
 * Displays account details when an account is selected.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Center, Stack, Text, Title } from '@mantine/core';
import { IconInbox, IconUser } from '@tabler/icons-react';
import { isAccountsViewState, type ViewState } from '../../../types/view-state';

interface AccountsContentProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Empty state when no account is selected.
 */
function EmptyAccountSelection() {
  return (
    <Center h="100%">
      <Stack align="center" gap="md">
        <IconInbox size={64} stroke={1.5} opacity={0.3} />
        <Text size="sm" c="dimmed" ta="center">
          <Trans>Select an account from the list to view details</Trans>
        </Text>
      </Stack>
    </Center>
  );
}

/**
 * Primary content for the accounts view.
 * Shows account details when an account is selected.
 */
export function AccountsContent({ viewState }: AccountsContentProps) {
  if (!isAccountsViewState(viewState)) return null;

  const { selectedId } = viewState.params;

  if (!selectedId) {
    return <EmptyAccountSelection />;
  }

  return (
    <Box p="md">
      <Stack gap="sm">
        <Stack gap="xs">
          <IconUser size={32} stroke={1.5} opacity={0.7} />
          <Title order={3}>
            <Trans>Account Details</Trans>
          </Title>
        </Stack>
        <Text size="sm" c="dimmed">
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          ID: {selectedId}
        </Text>
      </Stack>
    </Box>
  );
}
