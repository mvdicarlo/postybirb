import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Stack, Text, TextInput } from '@mantine/core';
import { E621AccountData, E621OAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { ExternalLink } from '../../shared/external-link';
import { createLoginHttpErrorHandler, notifyLoginFailed } from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'e621-login-form';

export default function E621LoginView(
  props: LoginViewProps<E621AccountData>,
): JSX.Element {
  const { account, data, notifyLoginSuccess } = props;
  const { id } = account;
  const [username, setUsername] = useState(data?.username ?? '');
  const [key, setKey] = useState(data?.key ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  return (
    <LoginViewContainer>
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          websitesApi
            .performOAuthStep<E621OAuthRoutes>(id, 'login', {
              username: username.trim(),
              key: key.trim(),
            })
            .then(({ result }) => {
              if (result) {
                notifyLoginSuccess();
                setKey('');
              } else {
                notifyLoginFailed();
              }
            })
            .catch(createLoginHttpErrorHandler())
            .finally(() => {
              setSubmitting(false);
            });
        }}
      >
        <Stack gap="md">
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">
              <Trans>
                e621 requires API credentials for posting. You'll need to
                generate an API key from your account settings to authenticate
                PostyBirb.
              </Trans>
            </Text>
          </Alert>

          <TextInput
            label={<Trans>Username</Trans>}
            name="username"
            placeholder="your_username"
            required
            minLength={1}
            value={username}
            onChange={(event) => {
              setUsername(event.currentTarget.value);
            }}
          />

          <TextInput
            // eslint-disable-next-line lingui/no-unlocalized-strings
            label="API Key"
            name="password"
            type="password"
            // eslint-disable-next-line lingui/no-unlocalized-strings
            placeholder="Your API key"
            description={
              <Text size="xs" c="dimmed">
                <Trans comment="E621 login form">
                  Generate an API key from your{' '}
                  <ExternalLink href="https://e621.net/users/home">
                    account settings
                  </ExternalLink>
                </Trans>
              </Text>
            }
            required
            minLength={1}
            value={key}
            onChange={(event) => {
              setKey(event.currentTarget.value);
            }}
          />

          <Box mt="md">
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={!username || !key}
              fullWidth
            >
              <Trans>Save</Trans>
            </Button>
          </Box>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
