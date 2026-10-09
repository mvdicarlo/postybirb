/**
 * AccountSectionHeader - Sticky header for accounts section panel.
 * Contains title, website visibility picker, and search/filter controls.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Group,
    SegmentedControl,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { IconHelp } from '@tabler/icons-react';
import { AccountLoginFilter, useAccountsFilter } from '../../../stores/ui/accounts-ui-store';
import { useTourActions } from '../../../stores/ui/tour-store';
import { ACCOUNTS_TOUR_ID } from '../../onboarding-tour/tours/accounts-tour';
import { SearchInput } from '../../shared';
import { WebsiteVisibilityPicker } from './website-visibility-picker';

/**
 * Sticky header for the accounts section panel.
 * Provides title, visibility toggles, and search/filter functionality.
 */
export function AccountSectionHeader() {
  const { searchQuery, loginFilter, setSearchQuery, setLoginFilter } =
    useAccountsFilter();
  const { startTour } = useTourActions();
  const { t } = useLingui();

  return (
    <Box
      p="sm"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-sticky)',
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
          <Group gap="xs">
            <Tooltip label={<Trans>Take the tour</Trans>}>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => startTour(ACCOUNTS_TOUR_ID)}
              >
                <IconHelp size={16} />
              </ActionIcon>
            </Tooltip>
            <WebsiteVisibilityPicker />
          </Group>
        </Group>

        {/* Search input */}
        <Box data-tour-id="accounts-search">
          <SearchInput
            size="xs"
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </Box>

        {/* Login status filter */}
        <SegmentedControl
          data-tour-id="accounts-login-filter"
          size="xs"
          fullWidth
          value={loginFilter}
          onChange={(value) => setLoginFilter(value as AccountLoginFilter)}
          data={[
            { value: AccountLoginFilter.All, label: t`All` },
            { value: AccountLoginFilter.LoggedIn, label: t`Logged in` },
            { value: AccountLoginFilter.NotLoggedIn, label: t`Not logged in` },
          ]}
        />
      </Stack>
    </Box>
  );
}
