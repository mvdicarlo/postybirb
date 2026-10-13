import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { PhilomenaAccountData, PhilomenaOAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { ExternalLink } from '../../shared/external-link';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const settingsUrls: Record<string, string> = {
  derpibooru: 'https://derpibooru.org/registrations/edit',
  furbooru: 'https://furbooru.org/registrations/edit',
  manebooru: 'https://manebooru.art/registrations/edit',
};

export default function PhilomenaLoginView({
  account,
  data,
  website,
}: LoginViewProps<PhilomenaAccountData>): JSX.Element {
  const [username, setUsername] = useState(data?.username ?? '');
  const [key, setKey] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const settingsUrl = settingsUrls[website.id];

  return (
    <LoginViewContainer>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isSubmitting || !username.trim() || !key.trim()) return;
          setSubmitting(true);
          websitesApi
            .performOAuthStep<PhilomenaOAuthRoutes>(account.id, 'login', {
              username: username.trim(),
              key: key.trim(),
            })
            .then(({ result }) => {
              if (result) {
                notifyLoginSuccess(account);
                setKey('');
              } else {
                notifyLoginFailed();
              }
            })
            .catch(createLoginHttpErrorHandler())
            .finally(() => setSubmitting(false));
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
                This Philomena website requires an API key for posting. Generate
                one from your account settings and enter it below.
              </Trans>
            </Text>
          </Alert>

          <TextInput
            label={<Trans>Username</Trans>}
            name="username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />

          <PasswordInput
            label={<Trans>API Key</Trans>}
            description={
              settingsUrl ? (
                <ExternalLink href={settingsUrl}>
                  <Trans>Open account settings</Trans>
                </ExternalLink>
              ) : undefined
            }
            name="password"
            autoComplete="off"
            required
            value={key}
            onChange={(event) => setKey(event.currentTarget.value)}
          />

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!username.trim() || !key.trim()}
            fullWidth
          >
            <Trans>Save</Trans>
          </Button>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
