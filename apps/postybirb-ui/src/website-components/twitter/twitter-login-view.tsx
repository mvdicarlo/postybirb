import { Trans } from "@lingui/react/macro";
import {
    Alert,
    Button,
    Group,
    Paper,
    PasswordInput,
    Stack,
    Stepper,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { TwitterAccountData, TwitterOAuthRoutes } from '@postybirb/types';
import {
    IconArrowLeft,
    IconCheck,
    IconExternalLink,
    IconKey,
    IconRefresh,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import websitesApi from '../../api/websites.api';
import {
    ExternalLink,
    openLink,
} from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';
import {
    createLoginHttpErrorHandler,
    notifyLoginFailed,
    notifyLoginSuccess,
} from '../website-login-helpers';

const formId = 'twitter-login-form';

export default function TwitterLoginView(
  props: LoginComponentProps<TwitterAccountData>,
): JSX.Element {
  const { account } = props;
  const { id, data } = account;

  const [apiKey, setApiKey] = useState(data?.apiKey ?? '');
  const [apiSecret, setApiSecret] = useState(data?.apiSecret ?? '');
  const [requestToken, setRequestToken] = useState<string | undefined>(
    undefined, // Don't initialize from data, always start fresh
  );
  const [authorizationUrl, setAuthorizationUrl] = useState<string>('');
  const [pin, setPin] = useState('');
  const [isStoringKeys, setIsStoringKeys] = useState(false);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<string | undefined>(
    undefined, // Don't initialize from data, let user see the flow
  );
  const [keysStored, setKeysStored] = useState(false); // Always start fresh

  const keysReady = apiKey.trim().length > 0 && apiSecret.trim().length > 0;
  const canRequestToken = keysReady && keysStored && !requestToken;
  const canComplete = Boolean(requestToken) && pin.trim().length > 0;

  // Always start on the first step when component loads
  const [activeStep, setActiveStep] = useState(0);

  // Only update loggedInAs when data changes, but don't affect step progression
  useEffect(() => {
    if (data?.screenName && !loggedInAs) {
      setLoggedInAs(data.screenName);
    }
    // If there are existing API keys, mark them as stored so user can proceed
    if (data?.apiKey && data?.apiSecret && !keysStored) {
      setKeysStored(true);
    }
  }, [data?.screenName, data?.apiKey, data?.apiSecret, loggedInAs, keysStored]);

  const handleGoBack = () => {
    if (activeStep === 2) {
      // Clear authorization state and go back to step 1
      setRequestToken(undefined);
      setAuthorizationUrl('');
      setPin('');
      setActiveStep(1);
    } else if (activeStep === 1) {
      // Go back to API keys setup
      setKeysStored(false);
      setActiveStep(0);
    }
  };

  const handleStartOver = () => {
    // Reset all state to start from beginning
    setKeysStored(false);
    setRequestToken(undefined);
    setAuthorizationUrl('');
    setPin('');
    setLoggedInAs(undefined);
    setActiveStep(0);
  };

  return (
    <Stack gap="lg">
      <Title order={3}>
        <Trans>Twitter / X Authentication</Trans>
      </Title>

      {loggedInAs && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          <Group justify="space-between">
            <Text>
              <Trans>Successfully logged in as @{loggedInAs}</Trans>
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
        </Alert>
      )}

      <Stepper
        active={activeStep}
        orientation="vertical"
        size="sm"
        completedIcon={<IconCheck size={16} />}
      >
        <Stepper.Step
          label={<Trans>Configure API Keys</Trans>}
          description={<Trans>Enter your Twitter app credentials</Trans>}
          icon={<IconKey size={16} />}
        >
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Alert color="blue" variant="light">
                <Text size="sm">
                  <Trans>
                    You need to create a Twitter app to get API keys.{' '}
                    <ExternalLink href="https://developer.twitter.com/en/portal/dashboard">
                      Visit Twitter Developer Portal
                    </ExternalLink>
                  </Trans>
                </Text>
              </Alert>

              <TextInput
                label={<Trans>API Key (Consumer Key)</Trans>}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                placeholder="Enter your API key"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.currentTarget.value.trim())}
                description={
                  <Trans>
                    Found in your Twitter app's Keys and tokens section
                  </Trans>
                }
              />

              <PasswordInput
                label={<Trans>API Secret (Consumer Secret)</Trans>}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                placeholder="Enter your API secret"
                required
                value={apiSecret}
                onChange={(e) => setApiSecret(e.currentTarget.value.trim())}
                description={
                  <Trans>Keep this secret and never share it publicly</Trans>
                }
              />

              {data?.apiKey && data?.apiSecret && (
                <Alert color="blue" variant="light">
                  <Text size="sm">
                    <Trans>
                      You have existing API keys. You can modify them above or
                      proceed to the next step.
                    </Trans>
                  </Text>
                </Alert>
              )}

              <Group>
                <Button
                  disabled={!keysReady}
                  loading={isStoringKeys}
                  onClick={() => {
                    setIsStoringKeys(true);
                    websitesApi
                      .performOAuthStep<TwitterOAuthRoutes, 'setApiKeys'>(
                        id,
                        'setApiKeys',
                        { apiKey, apiSecret },
                      )
                      .then(() => {
                        setKeysStored(true);
                        setActiveStep(1); // Advance to next step
                        notifyLoginSuccess(
                          <Trans>API keys saved successfully</Trans>,
                        );
                      })
                      .catch(
                        createLoginHttpErrorHandler(
                          <Trans>Failed to store API keys</Trans>,
                        ),
                      )
                      .finally(() => setIsStoringKeys(false));
                  }}
                >
                  {keysStored ? (
                    <Trans>Update API Keys</Trans>
                  ) : (
                    <Trans>Save API Keys</Trans>
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

        <Stepper.Step
          label={<Trans>Get Authorization</Trans>}
          description={<Trans>Generate authorization link</Trans>}
          icon={<IconExternalLink size={16} />}
        >
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                <Trans>
                  Click the button below to get your authorization URL
                </Trans>
              </Text>

              <Group>
                <Button
                  disabled={!canRequestToken}
                  loading={isRequestingToken}
                  onClick={() => {
                    setIsRequestingToken(true);
                    websitesApi
                      .performOAuthStep<TwitterOAuthRoutes, 'requestToken'>(
                        id,
                        'requestToken',
                        {},
                      )
                      .then((res) => {
                        if (res.success) {
                          setAuthorizationUrl(res.url || '');
                          if (res.oauthToken) setRequestToken(res.oauthToken);
                          setActiveStep(2); // Advance to next step
                          notifyLoginSuccess(
                            <Trans>Authorization URL generated</Trans>,
                          );

                          // Automatically open the authorization URL in the browser
                          if (res.url) {
                            openLink(res.url);
                          }
                        } else {
                          notifyLoginFailed(res.message);
                        }
                      })
                      .catch(
                        createLoginHttpErrorHandler(
                          <Trans>Failed to generate authorization URL</Trans>,
                        ),
                      )
                      .finally(() => setIsRequestingToken(false));
                  }}
                >
                  <Trans>Get Authorization URL</Trans>
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step
          label={<Trans>Complete Authorization</Trans>}
          description={<Trans>Enter the PIN from Twitter</Trans>}
        >
          <Paper p="md" withBorder>
            <Stack gap="md">
              {authorizationUrl && (
                <Alert color="blue" variant="light">
                  <Group>
                    <ExternalLink href={authorizationUrl}>
                      <Button
                        variant="light"
                        leftSection={<IconExternalLink size={16} />}
                      >
                        <Trans>Open Twitter Authorization Page</Trans>
                      </Button>
                    </ExternalLink>
                  </Group>
                  <Text size="sm" mt="xs">
                    <Trans>
                      Click the link above, authorize the app, and copy the PIN
                      code below
                    </Trans>
                  </Text>
                </Alert>
              )}

              <TextInput
                label={<Trans>PIN / Verifier Code</Trans>}
                // eslint-disable-next-line lingui/no-unlocalized-strings
                placeholder="Enter the PIN from Twitter"
                value={pin}
                required
                onChange={(e) => setPin(e.currentTarget.value.trim())}
                description={
                  <Trans>
                    You'll get this PIN after authorizing on Twitter
                  </Trans>
                }
              />

              <Group>
                <Button
                  disabled={!canComplete}
                  loading={isCompleting}
                  onClick={() => {
                    setIsCompleting(true);
                    websitesApi
                      .performOAuthStep<TwitterOAuthRoutes, 'completeOAuth'>(
                        id,
                        'completeOAuth',
                        { verifier: pin },
                      )
                      .then((res) => {
                        if (res.success) {
                          notifyLoginSuccess(
                            <Trans>Successfully logged in to Twitter!</Trans>,
                          );
                          setPin('');
                          setAuthorizationUrl('');
                          setRequestToken(undefined);
                          setActiveStep(3); // Advance to completion step
                          if (res.screenName) setLoggedInAs(res.screenName);
                        } else {
                          notifyLoginFailed(res.message);
                        }
                      })
                      .catch(
                        createLoginHttpErrorHandler(
                          <Trans>Failed to complete authorization</Trans>,
                        ),
                      )
                      .finally(() => setIsCompleting(false));
                  }}
                >
                  <Trans>Complete Login</Trans>
                </Button>
              </Group>
            </Stack>
          </Paper>
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
  );
}
