import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Divider,
  Drawer,
  Group,
  Input,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { IAccountDto, IWebsiteInfoDto } from '@postybirb/types';
import { IconSearch } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { ComponentErrorBoundary } from '../../../../components/error-boundary/specialized-error-boundaries';
import { useWebsites } from '../../../../hooks/account/use-websites';
import {
  getOverlayOffset,
  getPortalTarget,
  marginOffset,
} from '../drawer.util';
import { useDrawerToggle } from '../use-drawer-toggle';
import { WebsiteCard } from './website-card';
import { WebsiteLoginPanel } from './website-login-panel/website-login-panel';
import { WebsiteVisibilityPicker } from './website-visibility-picker';

export function AccountDrawer() {
  const [visible, toggle] = useDrawerToggle('accountDrawerVisible');
  const { accounts, isLoading, filteredWebsites } = useWebsites();
  const [loginAccount, setLoginAccount] = useState<{
    account: IAccountDto;
    website: IWebsiteInfoDto;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'logged-in' | 'not-logged-in'>(
    'all',
  );
  const { t } = useLingui();

  const filteredAndSearchedWebsites = useMemo(() => {
    if (!searchQuery && filter === 'all') return filteredWebsites;

    return filteredWebsites.filter((website) => {
      // Filter by search query
      const matchesSearch =
        !searchQuery ||
        website.displayName.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by login status
      let matchesFilter = true;
      if (filter === 'logged-in') {
        const websiteAccounts = accounts.filter(
          (acc) => acc.website === website.id,
        );
        matchesFilter = websiteAccounts.some((acc) => acc.state.isLoggedIn);
      } else if (filter === 'not-logged-in') {
        const websiteAccounts = accounts.filter(
          (acc) => acc.website === website.id,
        );
        matchesFilter =
          websiteAccounts.length === 0 ||
          websiteAccounts.some((acc) => !acc.state.isLoggedIn);
      }

      return matchesSearch && matchesFilter;
    });
  }, [accounts, filter, filteredWebsites, searchQuery]);
  if (isLoading) {
    return <Loader />;
  }

  return (
    <ComponentErrorBoundary>
      <>
        <Drawer
          className="account-drawer"
          closeOnClickOutside
          size="lg"
          ml={-marginOffset}
          portalProps={{
            target: getPortalTarget(),
          }}
          overlayProps={{
            left: getOverlayOffset(),
            zIndex: 100,
          }}
          trapFocus
          opened={visible}
          onClose={() => {
            setLoginAccount(null);
            toggle();
          }}
          title={
            <Text fw="bold" size="1.2rem">
              <Trans>Accounts</Trans>
            </Text>
          }
          styles={{
            body: {
              height: 'calc(100% - 60px)',
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          <Box mb="md">
            <WebsiteVisibilityPicker />
          </Box>

          <Divider mb="md" />

          <Group mb="md">
            <Input
              autoFocus
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1 }}
              rightSectionWidth={70}
              rightSection={
                searchQuery ? (
                  <Text
                    size="xs"
                    color="dimmed"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchQuery('')}
                  >
                    <Trans>Clear</Trans>
                  </Text>
                ) : null
              }
            />
          </Group>

          <SegmentedControl
            fullWidth
            mb="md"
            value={filter}
            onChange={(value) => setFilter(value as typeof filter)}
            data={[
              { value: 'all', label: t`All` },
              { value: 'logged-in', label: t`Logged In` },
              { value: 'not-logged-in', label: t`Not Logged In` },
            ]}
          />

          <ScrollArea style={{ flex: 1 }} offsetScrollbars>
            <Stack gap="md">
              {filteredAndSearchedWebsites.length > 0 ? (
                filteredAndSearchedWebsites.map((website) => (
                  <WebsiteCard
                    key={website.id}
                    website={website}
                    accounts={accounts.filter(
                      (account) => account.website === website.id,
                    )}
                    onLogin={(
                      login: {
                        account: IAccountDto;
                        website: IWebsiteInfoDto;
                      } | null,
                    ) => setLoginAccount(login)}
                  />
                ))
              ) : (
                <Box py="xl" ta="center">
                  <Text c="dimmed">
                    {searchQuery ? (
                      <Trans>No websites match your search criteria</Trans>
                    ) : (
                      <Trans>No websites available or visible</Trans>
                    )}
                  </Text>
                </Box>
              )}
            </Stack>
          </ScrollArea>
        </Drawer>
        {loginAccount && visible ? (
          <WebsiteLoginPanel
            key={loginAccount.account.id}
            {...loginAccount}
            onClose={() => {
              setLoginAccount(null);
            }}
          />
        ) : null}
      </>
    </ComponentErrorBoundary>
  );
}
