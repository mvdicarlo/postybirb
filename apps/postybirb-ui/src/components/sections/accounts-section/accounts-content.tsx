/**
 * AccountsContent - Primary content area for accounts view.
 * Displays login webview or custom login component when an account is selected.
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Alert,
  Box,
  Divider,
  Group,
  Loader,
  ScrollArea,
  Text,
  Title,
} from '@mantine/core';
import type { CustomLoginType, UserLoginType } from '@postybirb/types';
import { IconWorld, IconX } from '@tabler/icons-react';
import React, { useCallback } from 'react';
import { useNavigationStore } from '../../../stores';
import { useAccount } from '../../../stores/entity/account-store';
import { useWebsite } from '../../../stores/entity/website-store';
import { isAccountsViewState, type ViewState } from '../../../types/view-state';
import { EmptyState } from '../../empty-state';
import { CustomLoginPlaceholder } from './custom-login-placeholder';
import { LoginWebview } from './login-webview';

interface AccountsContentProps {
  /** Current view state */
  viewState: ViewState;
}

export const websiteWarningByName = new Map<string, () => React.ReactNode>();

/**
 * Header component showing website and account info.
 */
interface AccountHeaderProps {
  websiteName: string;
  websiteId: string;
  accountName: string;
  onClose: () => void;
}

function AccountHeader({
  websiteName,
  websiteId,
  accountName,
  onClose,
}: AccountHeaderProps) {
  const Warning = websiteWarningByName.get(websiteId);
  return (
    <Box
      p="md"
      style={{
        flexShrink: 0,
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      <Group
        gap="sm"
        style={{
          justifyContent: 'space-between',
        }}
      >
        <Group>
          <IconWorld size={24} stroke={1.5} />
          <Box>
            <Title order={4} lh={1.2}>
              {websiteName}
            </Title>
            <Text size="sm" c="dimmed">
              {accountName}
            </Text>
          </Box>
        </Group>
        <ActionIcon variant="subtle" size="sm" onClick={onClose} color="gray">
          <IconX size={16} />
        </ActionIcon>
        {Warning ? (
          <Alert color="yellow">
            <Warning />
          </Alert>
        ) : null}
      </Group>
    </Box>
  );
}

/**
 * Content component for user login type (webview).
 */
interface UserLoginContentProps {
  loginType: UserLoginType;
  accountId: string;
  websiteName: string;
  websiteId: string;
  accountName: string;
  onClose: () => void;
}

function UserLoginContent({
  loginType,
  accountId,
  websiteName,
  websiteId,
  accountName,
  onClose,
}: UserLoginContentProps) {
  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <AccountHeader
        websiteName={websiteName}
        websiteId={websiteId}
        accountName={accountName}
        onClose={onClose}
      />
      <Divider />
      <Box style={{ flex: 1, minHeight: 0 }}>
        <LoginWebview src={loginType.url} accountId={accountId} />
      </Box>
    </Box>
  );
}

/**
 * Content component for custom login type.
 */
interface CustomLoginContentProps {
  loginType: CustomLoginType;
  account: NonNullable<ReturnType<typeof useAccount>>;
  website: NonNullable<ReturnType<typeof useWebsite>>;
  onClose: () => void;
}

function CustomLoginContent({
  loginType,
  account,
  website,
  onClose,
}: CustomLoginContentProps) {
  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <AccountHeader
        websiteName={website.displayName}
        websiteId={website.id}
        accountName={account.name}
        onClose={onClose}
      />
      <Divider />
      <ScrollArea style={{ flex: 1 }} type="hover" scrollbarSize={6}>
        <Box p="md">
          <CustomLoginPlaceholder
            account={account}
            website={website}
            loginComponentName={loginType.loginComponentName}
          />
        </Box>
      </ScrollArea>
    </Box>
  );
}

/**
 * Primary content for the accounts view.
 * Shows login webview or custom login when an account is selected.
 */
export function AccountsContent({ viewState }: AccountsContentProps) {
  // Extract selectedId safely (empty string if not accounts view)
  const selectedId = isAccountsViewState(viewState)
    ? viewState.params.selectedId
    : null;

  const account = useAccount(selectedId ?? '');
  const website = useWebsite(account?.website ?? '');

  const { setViewState } = useNavigationStore();

  const onClose = useCallback(() => {
    if (!isAccountsViewState(viewState)) return;

    setViewState({
      ...viewState,
      params: {
        ...viewState.params,
        selectedId: null,
      },
    });
  }, [viewState, setViewState]);

  // Not an accounts view state
  if (!isAccountsViewState(viewState)) return null;

  // No account selected
  if (!selectedId) {
    return (
      <EmptyState
        preset="no-selection"
        message={<Trans>Select an account to log in</Trans>}
        description={<Trans>Choose an account from the list on the left</Trans>}
        size="lg"
      />
    );
  }

  // Loading state (account or website not yet loaded)
  if (!account || !website) {
    return (
      <Box
        h="100%"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader size="lg" />
      </Box>
    );
  }

  // Render based on login type
  if (website.loginType.type === 'user') {
    return (
      <UserLoginContent
        loginType={website.loginType}
        accountId={account.id}
        websiteName={website.displayName}
        websiteId={website.id}
        accountName={account.name}
        onClose={onClose}
      />
    );
  }

  if (website.loginType.type === 'custom') {
    return (
      <CustomLoginContent
        loginType={website.loginType}
        account={account}
        website={website}
        onClose={onClose}
      />
    );
  }

  // Fallback for unknown login type
  return (
    <EmptyState
      preset="no-records"
      message={<Trans>Unknown login type</Trans>}
      description={
        <Trans>This website has an unsupported login configuration</Trans>
      }
      size="lg"
    />
  );
}
