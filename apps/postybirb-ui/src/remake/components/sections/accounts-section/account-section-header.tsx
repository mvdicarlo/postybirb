/**
 * AccountSectionHeader - Sticky header for accounts section panel.
 * Contains title, website visibility picker, and search/filter controls.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import { Box, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { AccountLoginFilter, useAccountsFilter } from '../../../stores/ui/accounts-ui-store';
import { SearchInput } from '../../shared';
import { WebsiteVisibilityPicker } from './website-visibility-picker';

/**
 * Sticky header for the accounts section panel.
 * Provides title, visibility toggles, and search/filter functionality.
 */
export function AccountSectionHeader() {
  const { searchQuery, loginFilter, setSearchQuery, setLoginFilter } =
    useAccountsFilter();
  const { t } = useLingui();

  return (
    <Box
      p="sm"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--mantine-color-body)',
        // eslint-disable-next-line lingui/no-unlocalized-strings
        borderBottom: '1px solid var(--mantine-color-default-border)',
      }}
    >
      <Stack gap="xs">
        {/* Title row with visibility picker */}
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">
            <Trans>Accounts</Trans>
          </Text>
          <WebsiteVisibilityPicker />
        </Group>

        {/* Search input */}
        <SearchInput
          size="xs"
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Login status filter */}
        <SegmentedControl
          size="xs"
          fullWidth
          value={loginFilter}
          onChange={(value) => setLoginFilter(value as AccountLoginFilter)}
          data={[
            { value: AccountLoginFilter.All, label: t`All` },
            { value: AccountLoginFilter.LoggedIn, label: t`Logged In` },
            { value: AccountLoginFilter.NotLoggedIn, label: t`Not Logged In` },
          ]}
        />
      </Stack>
    </Box>
  );
}
