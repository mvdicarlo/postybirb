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
  Overlay,
  Paper,
  Text,
  Tooltip,
} from '@mantine/core';
import type { AccountId } from '@postybirb/types';
import { IconRefresh, IconUserCheck } from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import { useAccount } from '../../../stores';
import { showSuccessNotification } from '../../../utils';
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
  
  // Track if we've shown the success notification to avoid duplicates
  const hasShownSuccessNotification = useRef(false);

  // Debounced refresh login to avoid excessive API calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedRefreshLogin = useCallback(
    debounce(() => {
      accountApi.refreshLogin(accountId);
    }, 500),
    [accountId]
  );
  
  // Manual login check handler
  const handleCheckLogin = useCallback(() => {
    if (!isPending) {
      accountApi.refreshLogin(accountId);
    }
  }, [accountId, isPending]);
  
  // Show notification on first successful login
  useEffect(() => {
    if (isLoggedIn && !hasShownSuccessNotification.current) {
      hasShownSuccessNotification.current = true;
      const displayName = username || account?.name;
      showSuccessNotification(
        <Trans>Logged in{displayName ? ` as ${displayName}` : ''}</Trans>
      );
    }
  }, [isLoggedIn, username, account?.name]);

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
      // Update current URL after navigation
      try {
        const url = webview.getURL();
        if (url) {
          setCurrentUrl(url);
        }
      } catch {
        // Webview may not be ready
      }
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
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
          <Tooltip label={<Trans>Refresh page</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleRefresh}
              loading={isLoading}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={<Trans>Check login status</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleCheckLogin}
              loading={isPending}
              disabled={isPending}
              color="blue"
            >
              <IconUserCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Text
            size="xs"
            c="dimmed"
            truncate
            style={{ flex: 1, minWidth: 0 }}
          >
            {currentUrl}
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
        {/* Loading overlay */}
        {isLoading && (
          <Overlay
            color="var(--mantine-color-body)"
            backgroundOpacity={0.7}
            blur={2}
            center
          >
            <Loader size="lg" />
          </Overlay>
        )}

        {/* Webview element */}
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
