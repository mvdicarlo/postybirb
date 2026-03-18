/* eslint-disable lingui/no-unlocalized-strings */
import { Trans } from '@lingui/react/macro';
import {
    Alert,
    Box,
    Button,
    Group,
    Loader,
    Paper,
    PasswordInput,
    Stack,
    Stepper,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {
    InstagramAccountData,
    InstagramOAuthRoutes,
} from '@postybirb/types';
import {
    IconArrowLeft,
    IconCheck,
    IconKey,
    IconLogin,
    IconRefresh,
} from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { showSuccessNotification } from '../../../utils';
import type { WebviewTag } from '../../sections/accounts-section/webview-tag';
import { ExternalLink } from '../../shared/external-link';
import {
    createLoginHttpErrorHandler,
    notifyLoginFailed,
    notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

export default function InstagramLoginView(
  props: LoginViewProps<InstagramAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;

  const [appId, setAppId] = useState(data?.appId ?? '');
  const [appSecret, setAppSecret] = useState(data?.appSecret ?? '');
  const [authUrl, setAuthUrl] = useState<string | undefined>(undefined);
  const [isStoringKeys, setIsStoringKeys] = useState(false);
  const [isGettingAuthUrl, setIsGettingAuthUrl] = useState(false);
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<string | undefined>(undefined);
  const [tokenExpiry, setTokenExpiry] = useState<string | undefined>(
    data?.tokenExpiry,
  );
  const [keysStored, setKeysStored] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const webviewRef = useRef<WebviewTag | null>(null);
  const codeHandledRef = useRef(false);

  const keysReady = appId.trim().length > 0 && appSecret.trim().length > 0;

  useEffect(() => {
    if (data?.igUsername && !loggedInAs) {
      setLoggedInAs(`@${data.igUsername}`);
    }
    if (data?.appId && data?.appSecret && !keysStored) {
      setKeysStored(true);
    }
    if (data?.tokenExpiry) {
      setTokenExpiry(data.tokenExpiry);
    }
  }, [
    data?.igUsername,
    data?.appId,
    data?.appSecret,
    data?.tokenExpiry,
    loggedInAs,
    keysStored,
  ]);

  const handleGoBack = () => {
    if (activeStep === 2) {
      setAuthUrl(undefined);
      codeHandledRef.current = false;
      setActiveStep(1);
    } else if (activeStep === 1) {
      setAuthUrl(undefined);
      codeHandledRef.current = false;
      setKeysStored(false);
      setActiveStep(0);
    }
  };

  const handleStartOver = () => {
    setKeysStored(false);
    setAuthUrl(undefined);
    codeHandledRef.current = false;
    setLoggedInAs(undefined);
    setTokenExpiry(undefined);
    setActiveStep(0);
  };

  // Exchange the authorization code for tokens
  const doExchangeCode = useCallback(
    (code: string) => {
      if (isExchangingCode) return;
      setIsExchangingCode(true);
      websitesApi
        .performOAuthStep<InstagramOAuthRoutes, 'exchangeCode'>(
          id,
          'exchangeCode',
          { code },
        )
        .then((res) => {
          if (res.success) {
            notifyLoginSuccess(undefined, account);
            setAuthUrl(undefined);
            setActiveStep(3);
            if (res.igUsername) {
              setLoggedInAs(`@${res.igUsername}`);
            }
            if (res.tokenExpiry) {
              setTokenExpiry(res.tokenExpiry);
            }
          } else {
            notifyLoginFailed(res.message);
            // Allow retrying
            codeHandledRef.current = false;
          }
        })
        .catch(
          createLoginHttpErrorHandler(
            <Trans>Failed to complete authorization</Trans>,
          ),
        )
        .finally(() => setIsExchangingCode(false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, account, isExchangingCode],
  );

  // Listen for webview navigation to the callback URL to capture the code
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !authUrl) return undefined;

    const callbackPath = '/api/websites/instagram/callback';

    const handleNavigate = (event: Electron.DidNavigateEvent) => {
      if (codeHandledRef.current) return;

      try {
        const url = new URL(event.url);
        if (url.pathname === callbackPath) {
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          if (code) {
            codeHandledRef.current = true;
            doExchangeCode(code);
          } else if (error) {
            const desc = url.searchParams.get('error_description') || error;
            notifyLoginFailed(desc);
          }
        }
      } catch {
        // Not a valid URL, ignore
      }
    };

    webview.addEventListener('did-navigate', handleNavigate);
    return () => {
      webview.removeEventListener('did-navigate', handleNavigate);
    };
  }, [authUrl, doExchangeCode]);

  const formatExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <LoginViewContainer>
      <Stack gap="lg">
        <Title order={3}>
          <Trans>Instagram Authentication</Trans>
        </Title>

        {loggedInAs && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text>
                  <Trans>Successfully logged in as {loggedInAs}</Trans>
                </Text>
                <Button
                  variant="light"
                  size="compact-sm"
                  leftSection={<IconRefresh size={14} />}
                  onClick={handleStartOver}
                >
                  <Trans>Start Over</Trans>
                </Button>
              </Group>
              {tokenExpiry && (
                <Text size="xs" c="dimmed">
                  <Trans>
                    Token expires: {formatExpiry(tokenExpiry)}
                  </Trans>
                </Text>
              )}
              <Button
                variant="light"
                size="compact-sm"
                color="blue"
                loading={isRefreshing}
                onClick={() => {
                  setIsRefreshing(true);
                  websitesApi
                    .performOAuthStep<InstagramOAuthRoutes, 'refreshToken'>(
                      id,
                      'refreshToken',
                      {},
                    )
                    .then((res) => {
                      if (res.success) {
                        if (res.tokenExpiry) setTokenExpiry(res.tokenExpiry);
                        showSuccessNotification(
                          <Trans>Token refreshed successfully</Trans>,
                        );
                      } else {
                        notifyLoginFailed(res.message);
                      }
                    })
                    .catch(
                      createLoginHttpErrorHandler(
                        <Trans>Failed to refresh token</Trans>,
                      ),
                    )
                    .finally(() => setIsRefreshing(false));
                }}
              >
                <Trans>Refresh Token</Trans>
              </Button>
            </Stack>
          </Alert>
        )}

        <Stepper
          active={activeStep}
          orientation="vertical"
          size="sm"
          completedIcon={<IconCheck size={16} />}
        >
          {/* Step 0: Configure App Credentials */}
          <Stepper.Step
            label={<Trans>Configure Meta App</Trans>}
            description={<Trans>Enter your app credentials</Trans>}
            icon={<IconKey size={16} />}
          >
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Alert color="blue" variant="light">
                  <Stack gap="xs">
                    <Text size="sm" fw={600}>
                      <Trans>Prerequisites</Trans>
                    </Text>
                    <Text size="sm">
                      {'• Your Instagram account must be a '}
                      <Text span fw={600}>
                        Professional account
                      </Text>
                      {' (Business or Creator). You can convert in Instagram app → Settings → Account → Switch to Professional account.'}
                    </Text>

                    <Text size="sm" fw={600} mt="xs">
                      <Trans>App Setup Steps:</Trans>
                    </Text>

                    <Text size="sm" component="div">
                      {'1. Go to '}
                      <ExternalLink href="https://developers.facebook.com/apps/">
                        Meta Developer Apps
                      </ExternalLink>
                      {' and click '}
                      <Text span fw={600}>
                        Create App
                      </Text>
                      {'. Select the '}
                      <Text span fw={600}>
                        Manage messaging & content on Instagram
                      </Text>
                      {' use case, then choose '}
                      <Text span fw={600}>
                        Business
                      </Text>
                      {' type. Your app stays in Development Mode — no App Review needed.'}
                    </Text>
                    <Text size="sm">
                      {'2. Go to '}
                      <Text span fw={600}>
                        {'App Roles > Roles'}
                      </Text>
                      {' and click "Add People". Under the '}
                      <Text span fw={600}>
                        Instagram Testers
                      </Text>
                      {' tab, add your Instagram username. Then open Instagram → Settings → Apps and Websites → accept the tester invitation.'}
                    </Text>
                    <Text size="sm">
                      {'3. Go to '}
                      <Text span fw={600}>
                        {'Instagram > API setup with Instagram login'}
                      </Text>
                      {' and add this redirect URI:'}
                    </Text>
                    <Text
                      size="xs"
                      ff="monospace"
                      c="dimmed"
                      p="xs"
                      bg="var(--mantine-color-dark-7)"
                      style={{ borderRadius: 4 }}
                    >
                      {`https://localhost:${window.electron?.app_port || '9487'}/api/websites/instagram/callback`}
                    </Text>
                    <Text size="sm">
                      {'4. In '}
                      <Text span fw={600}>
                        {'App Settings > Basic'}
                      </Text>
                      {', copy your '}
                      <Text span fw={600}>
                        App ID
                      </Text>
                      {' and '}
                      <Text span fw={600}>
                        App Secret
                      </Text>
                      {' and paste them below.'}
                    </Text>
                  </Stack>
                </Alert>

                <TextInput
                  label={<Trans>App ID</Trans>}
                  placeholder="Enter your Meta App ID"
                  required
                  value={appId}
                  onChange={(e) => setAppId(e.currentTarget.value.trim())}
                />

                <PasswordInput
                  label={<Trans>App Secret</Trans>}
                  placeholder="Enter your Meta App Secret"
                  required
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.currentTarget.value.trim())}
                  description={
                    <Trans>Keep this secret and never share it publicly</Trans>
                  }
                />

                <Group>
                  <Button
                    disabled={!keysReady}
                    loading={isStoringKeys}
                    onClick={() => {
                      setIsStoringKeys(true);
                      websitesApi
                        .performOAuthStep<
                          InstagramOAuthRoutes,
                          'setAppCredentials'
                        >(id, 'setAppCredentials', { appId, appSecret })
                        .then(() => {
                          setKeysStored(true);
                          setActiveStep(1);
                          showSuccessNotification(
                            <Trans>App credentials saved</Trans>,
                          );
                        })
                        .catch(
                          createLoginHttpErrorHandler(
                            <Trans>Failed to store app credentials</Trans>,
                          ),
                        )
                        .finally(() => setIsStoringKeys(false));
                    }}
                  >
                    {keysStored ? (
                      <Trans>Update Credentials</Trans>
                    ) : (
                      <Trans>Save Credentials</Trans>
                    )}
                  </Button>

                  {keysStored && (
                    <Button variant="light" onClick={() => setActiveStep(1)}>
                      <Trans>Proceed to Authorization</Trans>
                    </Button>
                  )}
                </Group>
              </Stack>
            </Paper>
          </Stepper.Step>

          {/* Step 1: Authorize via embedded webview */}
          <Stepper.Step
            label={<Trans>Authorize</Trans>}
            description={<Trans>Log in to Instagram to grant access</Trans>}
            icon={<IconLogin size={16} />}
          >
            <Stack gap="md">
              {!authUrl && (
                <Paper p="md" withBorder>
                  <Stack gap="md">
                    <Alert color="blue" variant="light">
                      <Text size="sm">
                        <Trans>
                          Click below to start authorization. An Instagram login
                          window will appear — log in and grant permissions. The
                          code will be captured automatically.
                        </Trans>
                      </Text>
                    </Alert>

                    <Button
                      loading={isGettingAuthUrl}
                      leftSection={<IconLogin size={16} />}
                      onClick={() => {
                        setIsGettingAuthUrl(true);
                        codeHandledRef.current = false;
                        websitesApi
                          .performOAuthStep<
                            InstagramOAuthRoutes,
                            'getAuthUrl'
                          >(id, 'getAuthUrl', {})
                          .then((res) => {
                            if (res.success && res.url) {
                              setAuthUrl(res.url);
                            } else {
                              notifyLoginFailed(res.message);
                            }
                          })
                          .catch(
                            createLoginHttpErrorHandler(
                              <Trans>Failed to generate auth URL</Trans>,
                            ),
                          )
                          .finally(() => setIsGettingAuthUrl(false));
                      }}
                    >
                      <Trans>Start Instagram Authorization</Trans>
                    </Button>
                  </Stack>
                </Paper>
              )}

              {authUrl && (
                <Box
                  style={{
                    height: 500,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--mantine-color-default-border)',
                    position: 'relative',
                  }}
                >
                  {isExchangingCode && (
                    <Box
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.85)',
                        zIndex: 10,
                      }}
                    >
                      <Stack align="center" gap="sm">
                        <Loader size="lg" />
                        <Text size="sm">
                          <Trans>Completing authorization...</Trans>
                        </Text>
                      </Stack>
                    </Box>
                  )}
                  <webview
                    src={authUrl}
                    ref={(ref) => {
                      webviewRef.current = ref as WebviewTag;
                    }}
                    style={{ width: '100%', height: '100%' }}
                    // eslint-disable-next-line react/no-unknown-property
                    partition={`persist:instagram-oauth-${id}`}
                  />
                </Box>
              )}
            </Stack>
          </Stepper.Step>
        </Stepper>

        {/* Navigation Controls */}
        <Group justify="space-between" mt="md">
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={handleGoBack}
            disabled={activeStep === 0}
          >
            <Trans>Back</Trans>
          </Button>

          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleStartOver}
            color="red"
            variant="light"
          >
            <Trans>Start Over</Trans>
          </Button>
        </Group>
      </Stack>
    </LoginViewContainer>
  );
}
