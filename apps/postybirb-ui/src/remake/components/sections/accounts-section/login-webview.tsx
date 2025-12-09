/**
 * LoginWebview - A polished webview component for website login.
 * Displays a webview with a toolbar containing refresh button and URL display.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Box,
    Group,
    Loader,
    Overlay,
    Paper,
    Text,
    Tooltip,
} from '@mantine/core';
import type { AccountId } from '@postybirb/types';
import { IconRefresh } from '@tabler/icons-react';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import type { WebviewTag } from './webview-tag';

interface LoginWebviewProps {
  /** The URL to load in the webview */
  src: string;
  /** The account ID for session partitioning */
  accountId: AccountId;
}

/**
 * A polished webview component for website login.
 * Features a toolbar with refresh button and URL display,
 * plus a loading overlay while the page loads.
 */
export function LoginWebview({ src, accountId }: LoginWebviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(src);
  const webviewRef = useRef<WebviewTag | null>(null);

  // Debounced refresh login to avoid excessive API calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedRefreshLogin = useCallback(
    debounce(() => {
      accountApi.refreshLogin(accountId);
    }, 2000),
    [accountId]
  );

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
    };
  }, [debouncedRefreshLogin]);

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
          <Tooltip label={<Trans>Refresh</Trans>}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleRefresh}
              loading={isLoading}
            >
              <IconRefresh size={16} />
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
            zIndex={10}
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
