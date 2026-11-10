import { Trans } from '@lingui/react/macro';
import { Badge, Button, PasswordInput, Stack } from '@mantine/core';
import { TailspaceAccountData, TailspaceOAuthRoutes } from '@postybirb/types';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { useAccount } from '../../../stores';
import { ExternalLink } from '../../shared/external-link';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

export default function TailspaceLoginView({
  account,
}: LoginViewProps<TailspaceAccountData>): JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);
  const isLoggedIn = useAccount(account.id)?.isLoggedIn ?? false;

  return (
    <LoginViewContainer>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isSubmitting || !apiKey.trim()) return;
          setSubmitting(true);
          websitesApi
            .performOAuthStep<TailspaceOAuthRoutes>(account.id, 'login', {
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
          {isLoggedIn && (
            <Badge color="green" variant="light" size="lg" fullWidth>
              <Trans>Login verified</Trans>
            </Badge>
          )}
          <PasswordInput
            label={<Trans>API Key</Trans>}
            description={
              <ExternalLink href="https://tailspace.com/me/artist-home/settings/postybirb">
                <Trans>Creator settings / PostyBirb integration</Trans>
              </ExternalLink>
            }
            name="password"
            autoComplete="off"
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
