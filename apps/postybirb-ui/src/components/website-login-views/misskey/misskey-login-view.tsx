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
import { MisskeyAccountData, MisskeyOAuthRoutes } from '@postybirb/types';
import { IconCheck, IconExternalLink, IconServer } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { showSuccessNotification } from '../../../utils';
import { ExternalLink } from '../../shared/external-link';
import { createLoginHttpErrorHandler, notifyLoginSuccess } from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

export default function MisskeyLoginView(
  props: LoginViewProps<MisskeyAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;

  const [instanceUrl, setInstanceUrl] = useState(data?.instanceUrl ?? '');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState<string | undefined>(
    data?.username,
  );
  const [activeStep, setActiveStep] = useState(loggedInAs ? 2 : 0);

  const canGenerate = instanceUrl.trim().length > 0;

  const handleStartOver = () => {
    setInstanceUrl('');
    setAuthUrl('');
    setLoggedInAs(undefined);
    setActiveStep(0);
  };

  return (
    <LoginViewContainer>
      <Stack gap="lg">
        <Title order={3}>
          <Trans>Misskey Authentication</Trans>
        </Title>

        {loggedInAs && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            <Text>
              <Trans>Successfully logged in as {loggedInAs}</Trans>
            </Text>
            <Button
              size="xs"
              variant="subtle"
              onClick={handleStartOver}
              mt="xs"
            >
              <Trans>Log in to different instance</Trans>
            </Button>
          </Alert>
        )}

        <Stepper active={activeStep} orientation="vertical" size="sm">
          <Stepper.Step
            label={<Trans>Enter Instance URL</Trans>}
            description={<Trans>Specify your Misskey instance</Trans>}
            icon={<IconServer size={16} />}
          >
            <Paper p="md" withBorder>
              <Stack gap="md">
                <Alert color="blue" variant="light">
                  <Text size="sm">
                    <Trans>
                      Enter the URL of your Misskey instance (e.g.,
                      &quot;misskey.io&quot; or &quot;sharkey.example.com&quot;).
                      Works with Misskey and compatible forks.
                    </Trans>
                  </Text>
                </Alert>

                <TextInput
                  label={<Trans>Instance URL</Trans>}
                  placeholder="misskey.io"
                  required
                  value={instanceUrl}
                  onChange={(e) => setInstanceUrl(e.currentTarget.value.trim())}
                />

                <Button
                  disabled={!canGenerate}
                  loading={isGenerating}
                  onClick={() => {
                    setIsGenerating(true);
                    const cleanedUrl = instanceUrl
                      .replace(/^https?:\/\//, '')
                      .replace(/\/$/, '');
                    websitesApi
                      .performOAuthStep<
                        MisskeyOAuthRoutes,
                        'generateAuthUrl'
                      >(id, 'generateAuthUrl', { instanceUrl: cleanedUrl })
                      .then((res) => {
                        if (res.success && res.authUrl) {
                          setAuthUrl(res.authUrl);
                          setActiveStep(1);
                          showSuccessNotification(
                            <Trans>Authorization URL generated</Trans>,
                          );
                        } else if (!res.success && res.message) {
                          throw new Error(res.message);
                        }
                      })
                      .catch(
                        createLoginHttpErrorHandler(
                          <Trans>Failed to connect to instance</Trans>,
                        ),
                      )
                      .finally(() => setIsGenerating(false));
                  }}
                >
                  <Trans>Connect to Instance</Trans>
                </Button>
              </Stack>
            </Paper>
          </Stepper.Step>

          <Stepper.Step
            label={<Trans>Authorize</Trans>}
            description={
              <Trans>Authorize PostyBirb on your instance</Trans>
            }
            icon={<IconExternalLink size={16} />}
          >
            <Paper p="md" withBorder>
              <Stack gap="md">
                {authUrl && (
                  <Alert color="blue" variant="light">
                    <ExternalLink href={authUrl}>
                      <Trans>Click here to authorize PostyBirb</Trans>
                    </ExternalLink>
                    <Text size="sm" mt="xs">
                      <Trans>
                        After clicking &quot;Allow&quot; on your instance, come
                        back here and click &quot;Complete Login&quot;
                      </Trans>
                    </Text>
                  </Alert>
                )}

                <Button
                  loading={isCompleting}
                  onClick={() => {
                    setIsCompleting(true);
                    websitesApi
                      .performOAuthStep<MisskeyOAuthRoutes, 'completeAuth'>(
                        id,
                        'completeAuth',
                        {},
                      )
                      .then((res) => {
                        if (res.success && res.username) {
                          setLoggedInAs(res.username);
                          setActiveStep(2);
                          notifyLoginSuccess(undefined, account);
                        } else if (!res.success && res.message) {
                          throw new Error(res.message);
                        }
                      })
                      .catch(createLoginHttpErrorHandler())
                      .finally(() => setIsCompleting(false));
                  }}
                >
                  <Trans>Complete Login</Trans>
                </Button>

                <Button
                  variant="subtle"
                  onClick={() => {
                    setActiveStep(0);
                    setAuthUrl('');
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
                <Trans>Logged in</Trans>
              </Alert>
            </Paper>
          </Stepper.Completed>
        </Stepper>
      </Stack>
    </LoginViewContainer>
  );
}
