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
import { useCallback, useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import remoteApi from '../../../api/remote.api';
import { useAccount } from '../../../stores';
import {
    createLoginHttpErrorHandler,
    notifyLoginSuccess,
} from '../../website-login-views/helpers';
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

  // Ref mirror of the current URL so the login-check loop always reads the
  // latest value without the callback being re-created (which would re-register
  // every webview listener) on each navigation.
  const currentUrlRef = useRef(src);
  useEffect(() => {
    currentUrlRef.current = currentUrl;
  }, [currentUrl]);

  // True while a login check is actively running.
  const isCheckingRef = useRef(false);

  // Set whenever a new check is requested while one is already running.
  // Guarantees a trailing re-run so the FINAL page/session state is always the
  // one we report — this is what fixes stale "not logged in" results.
  const rerunRequestedRef = useRef(false);

  /**
   * Run a login check. Safe (and cheap) to call as often as needed:
   * - If no check is running, it starts one immediately.
   * - If a check is already running, it flags a trailing re-run so the loop
   *   runs again with the latest cookies/URL once the current pass finishes.
   *
   * This coalesces bursts of navigation events into a single in-flight check
   * plus (at most) one queued follow-up, while never dropping the most recent
   * request. The loop keeps draining requests so the last observed state
   * always wins.
   */
  const runLoginCheck = useCallback(async () => {
    // Always mark that a(nother) check has been requested.
    rerunRequestedRef.current = true;

    // If a check is already running, the running loop will pick this up.
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;
    try {
      while (rerunRequestedRef.current) {
        rerunRequestedRef.current = false;
        try {
          await remoteApi.setCookiesAndLocalStorage(
            accountId,
            currentUrlRef.current,
          );
          await accountApi.refreshLogin(accountId);
        } catch {
          // Transient failures (network blips during login) are expected and
          // will be re-checked on the next navigation or cookie change. Don't
          // spam notifications.
        }
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [accountId]);

  // Manual login check handler — kicks off a fresh authoritative check.
  const handleCheckLogin = useCallback(() => {
    runLoginCheck();
  }, [runLoginCheck]);

  // Show notification on first successful login
  useEffect(() => {
    if (
      isLoggedIn &&
      hasShownSuccessNotification.current !== accountId &&
      account
    ) {
      hasShownSuccessNotification.current = accountId;
      notifyLoginSuccess(account);
      remoteApi
        .setCookiesAndLocalStorage(accountId, currentUrl)
        .catch(createLoginHttpErrorHandler());
    }
  }, [isLoggedIn, username, account?.name, accountId, account, currentUrl]);

  // Handle webview events
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return undefined;

    const handleStartLoading = () => {
      setIsLoading(true);
    };

    const handleStopLoading = () => {
      setIsLoading(false);
      // Automatic check after page finishes loading.
      runLoginCheck();
    };

    const handleDidNavigate = (event: Electron.DidNavigateEvent) => {
      setCurrentUrl(event.url);
      // Full navigation is a strong signal — check (coalesced with the
      // did-stop-loading check that follows once cookies have settled).
      runLoginCheck();
    };

    // SPA navigations (pushState, replaceState, hashchange) don't trigger
    // did-navigate or did-stop-loading — catch them explicitly
    const handleDidNavigateInPage = (
      event: Electron.DidNavigateInPageEvent,
    ) => {
      setCurrentUrl(event.url);
      runLoginCheck();
    };

    // Iframe navigations (OAuth callback frames, CAPTCHA frames)
    const handleFrameNavigation = () => {
      runLoginCheck();
    };

    // HTTP redirects (302 during OAuth flows) — the final landing page
    // may set cookies before did-stop-loading fires
    const handleRedirect = () => {
      runLoginCheck();
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    webview.addEventListener('did-frame-navigate', handleFrameNavigation);
    webview.addEventListener('did-redirect-navigation', handleRedirect);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener(
        'did-navigate-in-page',
        handleDidNavigateInPage,
      );
      webview.removeEventListener('did-frame-navigate', handleFrameNavigation);
      webview.removeEventListener('did-redirect-navigation', handleRedirect);
      // Fire a final login check when the webview closes (user is done)
      runLoginCheck();
    };
  }, [runLoginCheck]);

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

          <Tooltip
            label={
              isPending ? (
                <Trans>Login check in progress...</Trans>
              ) : (
                <Trans>Check login status</Trans>
              )
            }
          >
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={handleCheckLogin}
              color="blue"
              loading={isPending}
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
