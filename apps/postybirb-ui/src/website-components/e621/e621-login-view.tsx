import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { E621AccountData, E621OAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../api/websites.api';
import { ExternalLink } from '../../components/external-link/external-link';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';
import { CommonTranslations } from '../../translations/common-translations';
import {
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../website-login-helpers';

const formId = 'e621-login-form';

export default function E621LoginView(
  props: LoginComponentProps<E621AccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [username, setUsername] = useState(data?.username ?? '');
  const [key, setKey] = useState(data?.key ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  return (
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
          .catch(({ error }: { error: HttpErrorResponse }) => {
            notifications.show({
              title: (
                <span>
                  {error.statusCode} {error.error}
                </span>
              ),
              message: error.message,
              color: 'red',
            });
          })
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <Trans>
              e621 requires API credentials for posting. You'll need to generate
              an API key from your account settings to authenticate PostyBirb.
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
            <CommonTranslations.Save />
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
