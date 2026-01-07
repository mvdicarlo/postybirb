import { Trans } from '@lingui/react/macro';
import {
    Alert,
    Button,
    Paper,
    Stack,
    Stepper,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { MegalodonAccountData, MegalodonOAuthRoutes } from '@postybirb/types';
import { IconCheck, IconExternalLink, IconServer } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { ExternalLink } from '../../shared/external-link';
import {
    createLoginHttpErrorHandler,
    notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const AUTH_CODE_PLACEHOLDER = 'Authorization code';

export default function MegalodonLoginView(
  props: LoginViewProps<MegalodonAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;

  const [instanceUrl, setInstanceUrl] = useState(data?.instanceUrl ?? '');
  const [authorizationUrl, setAuthorizationUrl] = useState<string>('');
  const [authCode, setAuthCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<string | undefined>(
    data?.username,
  );
  const [activeStep, setActiveStep] = useState(loggedInAs ? 2 : 0);

  const canRegister = instanceUrl.trim().length > 0;
  const canComplete = authCode.trim().length > 0;

  const handleStartOver = () => {
    setInstanceUrl('');
    setAuthorizationUrl('');
    setAuthCode('');
    setLoggedInAs(undefined);
    setActiveStep(0);
  };

  return (
    <LoginViewContainer>
      <Stack gap="lg">
        <Title order={3}>
        <Trans>Fediverse Authentication</Trans>
      </Title>

      {loggedInAs && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          <Text>
            <Trans>Successfully logged in as {loggedInAs}</Trans>
          </Text>
          <Button size="xs" variant="subtle" onClick={handleStartOver} mt="xs">
            <Trans>Log in to different instance</Trans>
          </Button>
        </Alert>
      )}

      <Stepper active={activeStep} orientation="vertical" size="sm">
        <Stepper.Step
          label={<Trans>Enter Instance URL</Trans>}
          description={<Trans>Specify your Fediverse instance</Trans>}
          icon={<IconServer size={16} />}
        >
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Alert color="blue" variant="light">
                <Text size="sm">
                  <Trans>
                    Enter the URL of your Mastodon, Pleroma, or Pixelfed
                    instance (e.g., &quot;mastodon.social&quot; or
                    &quot;pixelfed.social&quot;)
                  </Trans>
                </Text>
              </Alert>

              <TextInput
                label={<Trans>Instance URL</Trans>}
                placeholder="mastodon.social"
                required
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.currentTarget.value.trim())}
              />

              <Button
                disabled={!canRegister}
                loading={isRegistering}
                onClick={() => {
                  setIsRegistering(true);
                  const cleanedUrl = instanceUrl
                    .replace(/^https?:\/\//, '')
                    .replace(/\/$/, '');
                  websitesApi
                    .performOAuthStep<MegalodonOAuthRoutes, 'registerApp'>(
                      id,
                      'registerApp',
                      { instanceUrl: cleanedUrl },
                    )
                    .then((res) => {
                      if (res.success && res.authorizationUrl) {
                        setAuthorizationUrl(res.authorizationUrl);
                        setActiveStep(1);
                        notifyLoginSuccess(
                          <Trans>App registered successfully</Trans>,
                        );
                      } else if (!res.success && res.message) {
                        throw new Error(res.message);
                      }
                    })
                    .catch(
                      createLoginHttpErrorHandler(
                        <Trans>Failed to register with instance</Trans>,
                      ),
                    )
                    .finally(() => setIsRegistering(false));
                }}
              >
                <Trans>Register Instance</Trans>
              </Button>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Step
          label={<Trans>Authorize</Trans>}
          description={<Trans>Get authorization code</Trans>}
          icon={<IconExternalLink size={16} />}
        >
          <Paper p="md" withBorder>
            <Stack gap="md">
              {authorizationUrl && (
                <Alert color="blue" variant="light">
                  <ExternalLink href={authorizationUrl}>
                    <Trans>Click here to authorize PostyBirb</Trans>
                  </ExternalLink>
                  <Text size="sm" mt="xs">
                    <Trans>
                      After authorizing, copy the code and paste it below
                    </Trans>
                  </Text>
                </Alert>
              )}

              <TextInput
                label={<Trans>Authorization Code</Trans>}
                placeholder={AUTH_CODE_PLACEHOLDER}
                value={authCode}
                required
                onChange={(e) => setAuthCode(e.currentTarget.value.trim())}
              />

              <Button
                disabled={!canComplete}
                loading={isCompleting}
                onClick={() => {
                  setIsCompleting(true);
                  websitesApi
                    .performOAuthStep<MegalodonOAuthRoutes, 'completeOAuth'>(
                      id,
                      'completeOAuth',
                      { authCode },
                    )
                    .then((res) => {
                      if (res.success && res.username) {
                        setLoggedInAs(res.username);
                        setActiveStep(2);
                        notifyLoginSuccess();
                      } else if (!res.success && res.message) {
                        throw new Error(res.message);
                      }
                    })
                    .catch(createLoginHttpErrorHandler())
                    .finally(() => setIsCompleting(false));
                }}
              >
                <Trans>Login</Trans>
              </Button>

              <Button
                variant="subtle"
                onClick={() => {
                  setActiveStep(0);
                  setAuthCode('');
                }}
              >
                <Trans>Go back</Trans>
              </Button>
            </Stack>
          </Paper>
        </Stepper.Step>

        <Stepper.Completed>
          <Paper p="md" withBorder>
            <Alert color="green">
              <Trans>Logged In</Trans>
            </Alert>
          </Paper>
        </Stepper.Completed>
      </Stepper>
      </Stack>
    </LoginViewContainer>
  );
}
