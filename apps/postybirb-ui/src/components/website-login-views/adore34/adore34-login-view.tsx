import { Trans, useLingui } from '@lingui/react/macro';
import { Alert, Button, Stack, Text, TextInput } from '@mantine/core';
import { Adore34AccountData, Adore34OAuthRoutes } from '@postybirb/types';
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

export default function Adore34LoginView({
  account,
}: LoginViewProps<Adore34AccountData>): JSX.Element {
  const { t } = useLingui();
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  return (
    <LoginViewContainer>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isSubmitting || !apiKey.trim()) return;
          setSubmitting(true);
          websitesApi
            .performOAuthStep<Adore34OAuthRoutes>(account.id, 'login', {
              apiKey: apiKey.trim(),
            })
            .then(({ result }) => {
              if (result) {
                setApiKey('');
                notifyLoginSuccess(account);
              } else {
                notifyLoginFailed(
                  <Trans>
                    Check that your Adore34 PostyBirb API key is active and has
                    files:upload, posts:write, and tiers:read permissions.
                  </Trans>,
                );
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
                Go to <ExternalLink inline href="https://adore34.com/en/creator-settings/integrations">Adore34</ExternalLink>{' '}
                under your creator account. In Creator Settings, open Integrations under
                Security, enable PostyBirb, and copy the personal API key.
              </Trans>
            </Text>
          </Alert>
          <TextInput
            label={t`Personal API key`}
            description={t`The key starts with adore_ak_ and is only shown once by Adore34.`}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={apiKey}
            onChange={(event) => setApiKey(event.currentTarget.value)}
          />
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!apiKey.trim()}
            fullWidth
          >
            <Trans>Save</Trans>
          </Button>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
