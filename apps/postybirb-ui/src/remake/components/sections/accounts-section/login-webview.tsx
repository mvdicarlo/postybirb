/**
 * LoginWebview - A polished webview component for website login.
 * Displays a webview with a toolbar containing refresh button, URL display,
 * login status indicator, and manual login check button.
 */

import { Trans } from '@lingui/react/macro';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Loader,
  Paper,
  Text,
  Tooltip,
} from '@mantine/core';
import type { AccountId } from '@postybirb/types';
import {
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconUserCheck,
} from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import { useAccount } from '../../../stores';
import { notifyLoginSuccess } from '../../website-login-views/helpers';
import type { WebviewTag } from './webview-tag';

interface LoginWebviewProps {
  /** The URL to load in the webview */
  src: string;
  /** The account ID for session partitioning */
  accountId: AccountId;
}

/**
 * A polished webview component for website login.
 * Features a toolbar with refresh button, login check button, URL display,
 * login status indicator, plus a loading overlay while the page loads.
 */
export function LoginWebview({ src, accountId }: LoginWebviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(src);
  const webviewRef = useRef<WebviewTag | null>(null);

  // Subscribe to account state for real-time login status updates
  const account = useAccount(accountId);
  const isPending = account?.isPending ?? false;
  const isLoggedIn = account?.isLoggedIn ?? false;
  const username = account?.username;

  // Track to which account we've shown the success notification to avoid duplicates
  const hasShownSuccessNotification = useRef<string | null>(null);

  // Debounced refresh login to avoid excessive API calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedRefreshLogin = useCallback(
    debounce(() => {
      accountApi.refreshLogin(accountId);
    }, 500),
    [accountId],
  );

  // Manual login check handler
  const handleCheckLogin = useCallback(() => {
    if (!isPending) {
      accountApi.refreshLogin(accountId);
    }
  }, [accountId, isPending]);

  // Show notification on first successful login
  useEffect(() => {
    if (isLoggedIn && hasShownSuccessNotification.current !== accountId) {
      hasShownSuccessNotification.current = accountId;
      notifyLoginSuccess(username || account?.name || '', account);
    }
  }, [isLoggedIn, username, account?.name, accountId, account]);

  // Handle webview events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return undefined;

    const handleStartLoading = () => {
      setIsLoading(true);
    };

    const handleStopLoading = () => {
      setIsLoading(false);
      debouncedRefreshLogin();
    };

    const handleConsoleMessage = (
      event: Electron.ConsoleMessageEvent,
    ): void => {
      // eslint-disable-next-line no-console
      console.log(`WEBVIEW: ${event.message}`);
    };

    const handleDidNavigate = (event: Electron.DidNavigateEvent) => {
      setCurrentUrl(event.url);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('console-message', handleConsoleMessage);
    webview.addEventListener('did-navigate', handleDidNavigate);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('console-message', handleConsoleMessage);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      debouncedRefreshLogin.cancel();
      // Trigger final login check when webview closes
      accountApi.refreshLogin(accountId);
    };
  }, [debouncedRefreshLogin, accountId]);

  // Handle refresh button click
  const handleRefresh = () => {
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
  };

  const handleGoBack = () => webviewRef.current?.goBack();

  const handleGoForward = () => webviewRef.current?.goForward();

  // If user had navigated in webview and tries to change account (partition) to another webview
  // it throws 'The object has already navigated, so its partition cannot be changed.'
  // so we must recreate webview
  const lastAccount = useRef(accountId);
  const [resetWebview, setResetWebview] = useState(false);

  useEffect(() => {
    if (lastAccount.current !== accountId) {
      lastAccount.current = accountId;
      setCurrentUrl(src);
      setResetWebview(true);
    } else {
      setResetWebview(false);
    }
  }, [lastAccount, accountId, resetWebview, src]);

  if (resetWebview) return null;

  return (
    <Box
      h="100%"
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <Paper p="xs" withBorder radius={0} style={{ flexShrink: 0 }}>
        <Group gap="sm">
          <Tooltip label={<Trans>Go back</Trans>}>
            <ActionIcon variant="subtle" size="sm" onClick={handleGoBack}>
              <IconArrowLeft size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={<Trans>Go forward</Trans>}>
            <ActionIcon variant="subtle" size="sm" onClick={handleGoForward}>
              <IconArrowRight size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={<Trans>Refresh page</Trans>}>
            <ActionIcon variant="subtle" size="sm" onClick={handleRefresh}>
              {isLoading ? <Loader size={16} /> : <IconRefresh size={16} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label={<Trans>Check login status</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleCheckLogin}
              color="blue"
            >
              <IconUserCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Text size="xs" c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
            {/** THIS IS CRITICAL, without the slice webview will turn blank on accounts.google.com. This is really strange bug in electron or maybe security defense mechanism but its just better to keep it like this */}
            {currentUrl.slice(0, 100)}
          </Text>
          {/* Login status badge */}
          {isPending ? (
            <Badge size="xs" color="yellow" variant="light">
              <Trans>Checking...</Trans>
            </Badge>
          ) : isLoggedIn ? (
            <Badge size="xs" color="green" variant="light">
              <Trans>Logged in{username ? ` as ${username}` : ''}</Trans>
            </Badge>
          ) : (
            <Badge size="xs" color="gray" variant="light">
              <Trans>Not logged in</Trans>
            </Badge>
          )}
        </Group>
      </Paper>

      {/* Webview container */}
      <Box
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
        }}
      >
        <webview
          src={src}
          ref={(ref) => {
            webviewRef.current = ref as WebviewTag;
          }}
          style={{
            width: '100%',
            height: '100%',
          }}
          // eslint-disable-next-line react/no-unknown-property
          webpreferences="nativeWindowOpen=1"
          // eslint-disable-next-line react/no-unknown-property
          partition={`persist:${accountId}`}
          // eslint-disable-next-line react/no-unknown-property, @typescript-eslint/no-explicit-any
          allowpopups={'true' as any}
        />
      </Box>
    </Box>
  );
}
