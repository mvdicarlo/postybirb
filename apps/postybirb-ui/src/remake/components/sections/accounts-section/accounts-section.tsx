/**
 * AccountsSection - Section panel content for accounts view.
 * Displays a list of websites with their accounts, with search and filter support.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Divider, Loader, ScrollArea, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import accountApi from '../../../api/account.api';
import { useAccounts, useAccountsLoading } from '../../../stores/account-store';
import { useAccountsFilter, useUIStore } from '../../../stores/ui-store';
import { useWebsites, useWebsitesLoading } from '../../../stores/website-store';
import { AccountLoginFilter } from '../../../types/account-filters';
import {
    isAccountsViewState,
    type ViewState,
} from '../../../types/view-state';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
    showErrorNotification,
    showSuccessNotification,
} from '../../../utils/notifications';
import { AccountSectionHeader } from './account-section-header';
import { WebsiteAccountCard } from './website-account-card';

interface AccountsSectionProps {
  /** Current view state */
  viewState: ViewState;
}

/**
 * Section panel content for the accounts view.
 * Displays a list of accounts organized by website with filtering.
 */
export function AccountsSection({ viewState }: AccountsSectionProps) {
  const websites = useWebsites();
  const accounts = useAccounts();
  const { isLoading: websitesLoading } = useWebsitesLoading();
  const { isLoading: accountsLoading } = useAccountsLoading();
  const { searchQuery, loginFilter, hiddenWebsites } = useAccountsFilter();
  const setViewState = useUIStore((state) => state.setViewState);

  // Get selected account ID from view state
  const selectedAccountId = isAccountsViewState(viewState)
    ? viewState.params.selectedId
    : null;

  // Handle selecting an account (updates view state)
  const handleSelectAccount = (accountId: string) => {
    if (isAccountsViewState(viewState)) {
      setViewState({
        ...viewState,
        params: {
          ...viewState.params,
          selectedId: accountId,
        },
      });
    }
  };

  // Handle deleting an account
  const handleDeleteAccount = async (accountId: string) => {
    try {
      await accountApi.remove([accountId]);
      showDeletedNotification(1);
    } catch {
      showDeleteErrorNotification();
    }
  };

  // Handle resetting an account (clears data/cookies)
  const handleResetAccount = async (accountId: string) => {
    try {
      await accountApi.clear(accountId);
      showSuccessNotification(<Trans>Account data cleared</Trans>);
    } catch {
      showErrorNotification(<Trans>Failed to clear account data</Trans>);
    }
  };

  // Group accounts by website
  const accountsByWebsite = useMemo(() => {
    const grouped = new Map<string, typeof accounts>();
    accounts.forEach((account) => {
      const existing = grouped.get(account.website) ?? [];
      existing.push(account);
      grouped.set(account.website, existing);
    });
    return grouped;
  }, [accounts]);

  // Filter websites based on visibility, search, and login status
  // eslint-disable-next-line arrow-body-style
  const filteredWebsites = useMemo(() => {
    return websites.filter((website) => {
      // Filter out hidden websites
      if (hiddenWebsites.includes(website.id)) {
        return false;
      }

      // Get accounts for this website
      const websiteAccounts = accountsByWebsite.get(website.id) ?? [];

      // Filter by search query (website name or account name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesWebsite = website.displayName.toLowerCase().includes(query);
        const matchesAccount = websiteAccounts.some(
          (acc) =>
            acc.name.toLowerCase().includes(query) ||
            acc.username?.toLowerCase().includes(query)
        );
        if (!matchesWebsite && !matchesAccount) {
          return false;
        }
      }

      // Filter by login status
      if (loginFilter === AccountLoginFilter.LoggedIn) {
        // Hide websites with no accounts when filtering by logged in
        if (websiteAccounts.length === 0) {
          return false;
        }
        const hasLoggedIn = websiteAccounts.some((acc) => acc.isLoggedIn);
        if (!hasLoggedIn) {
          return false;
        }
      } else if (loginFilter === AccountLoginFilter.NotLoggedIn) {
        // Hide websites with no accounts when filtering by not logged in
        if (websiteAccounts.length === 0) {
          return false;
        }
        const hasNotLoggedIn = websiteAccounts.some((acc) => !acc.isLoggedIn);
        if (!hasNotLoggedIn) {
          return false;
        }
      }

      return true;
    });
  }, [websites, hiddenWebsites, searchQuery, loginFilter, accountsByWebsite]);

  // Sort websites: those with accounts first (alphabetically), then those without (alphabetically)
  // eslint-disable-next-line arrow-body-style
  const sortedWebsites = useMemo(() => {
    return [...filteredWebsites].sort((a, b) => {
      const aHasAccounts = (accountsByWebsite.get(a.id)?.length ?? 0) > 0;
      const bHasAccounts = (accountsByWebsite.get(b.id)?.length ?? 0) > 0;

      // Prioritize websites with accounts
      if (aHasAccounts && !bHasAccounts) return -1;
      if (!aHasAccounts && bHasAccounts) return 1;

      // Within each group, sort alphabetically
      return a.displayName.localeCompare(b.displayName);
    });
  }, [filteredWebsites, accountsByWebsite]);

  // Filter accounts within each website based on search
  const getFilteredAccounts = (websiteId: string) => {
    const websiteAccounts = accountsByWebsite.get(websiteId) ?? [];
    
    if (!searchQuery) {
      return websiteAccounts;
    }

    const query = searchQuery.toLowerCase();
    return websiteAccounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(query) ||
        acc.username?.toLowerCase().includes(query)
    );
  };

  const isLoading = websitesLoading || accountsLoading;

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Sticky header */}
      <AccountSectionHeader />

      <Divider />

      {/* Scrollable website list */}
      <ScrollArea style={{ flex: 1 }} type="hover" scrollbarSize={6}>
        {isLoading ? (
          <Box p="md" ta="center">
            <Loader size="sm" />
          </Box>
        ) : sortedWebsites.length === 0 ? (
          <Box p="md" ta="center">
            <Text size="sm" c="dimmed">
              <Trans>No websites found</Trans>
            </Text>
          </Box>
        ) : (
          <Stack gap="xs" p="xs">
            {sortedWebsites.map((website) => (
              <WebsiteAccountCard
                key={website.id}
                website={website}
                accounts={getFilteredAccounts(website.id)}
                selectedAccountId={selectedAccountId}
                onAccountSelect={handleSelectAccount}
                onLoginRequest={handleSelectAccount}
                onDeleteAccount={handleDeleteAccount}
                onResetAccount={handleResetAccount}
              />
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Box>
  );
}

