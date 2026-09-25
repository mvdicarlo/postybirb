import { Trans } from '@lingui/react/macro';
import { Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { PrometheusAccountData, PrometheusOAuthRoutes } from '@postybirb/types';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

export default function PrometheusLoginView({
  account,
  data,
}: LoginViewProps<PrometheusAccountData>): JSX.Element {
  const [username, setUsername] = useState(data?.username ?? '');
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  return (
    <LoginViewContainer>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isSubmitting || !username.trim() || !apiKey.trim()) return;
          setSubmitting(true);
          websitesApi
            .performOAuthStep<PrometheusOAuthRoutes>(account.id, 'login', {
              username: username.trim(),
              apiKey: apiKey.trim(),
            })
            .then(({ result }) => {
              if (result) {
                notifyLoginSuccess(account);
                setApiKey('');
              } else {
                notifyLoginFailed();
              }
            })
            .catch(createLoginHttpErrorHandler())
            .finally(() => setSubmitting(false));
        }}
      >
        <Stack gap="md">
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
            description={<Trans>Settings / Security</Trans>}
            name="password"
            autoComplete="off"
            required
            value={apiKey}
            onChange={(event) => setApiKey(event.currentTarget.value)}
          />
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!username.trim() || !apiKey.trim()}
            fullWidth
          >
            <Trans>Save</Trans>
          </Button>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
