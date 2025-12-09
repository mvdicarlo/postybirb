/**
 * AccountsSection - Section panel content for accounts view.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Text } from '@mantine/core';
import { isAccountsViewState, type ViewState } from '../../../types/view-state';

interface AccountsSectionProps {
  /** Current view state */
  viewState: ViewState;
  /** Callback when an item is selected */
  onItemSelect?: (itemId: string) => void;
}

/**
 * Section panel content for the accounts view.
 * Displays a list of accounts organized by website.
 */
export function AccountsSection({ viewState, onItemSelect }: AccountsSectionProps) {
  return (
    <Box p="md">
      <Text size="sm" c="dimmed">
        <Trans>Accounts List</Trans>
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
        Selected: {isAccountsViewState(viewState) ? viewState.params.selectedId || 'none' : 'none'}
      </Text>
    </Box>
  );
}
