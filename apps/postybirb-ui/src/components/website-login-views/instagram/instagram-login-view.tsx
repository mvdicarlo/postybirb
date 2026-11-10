import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Button,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { InstagramAccountData, InstagramOAuthRoutes } from '@postybirb/types';
import { IconCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import accountApi from '../../../api/account.api';
import websitesApi from '../../../api/websites.api';
import { showSuccessNotification } from '../../../utils';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';
import { InstagramSetupGuide } from './instagram-setup-guide';

export default function InstagramLoginView(
  props: LoginViewProps<InstagramAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;

  const [accessToken, setAccessToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForgetting, setIsForgetting] = useState(false);
  const [loggedInAs, setLoggedInAs] = useState(data?.igUsername);
  const [tokenExpiry, setTokenExpiry] = useState(data?.tokenExpiry);
  const [apiType, setApiType] = useState(data?.apiType);
  const prevIdRef = useRef(id);

  useEffect(() => {
    if (prevIdRef.current !== id) {
      prevIdRef.current = id;
      setAccessToken('');
      setIsSubmitting(false);
      setIsRefreshing(false);
      setIsForgetting(false);
      setLoggedInAs(data?.igUsername);
      setTokenExpiry(data?.tokenExpiry);
      setApiType(data?.apiType);
    }
  }, [id, data]);

  useEffect(() => {
    setLoggedInAs(data?.igUsername);
    setTokenExpiry(data?.tokenExpiry);
    setApiType(data?.apiType);
  }, [data?.igUsername, data?.tokenExpiry, data?.apiType]);

  return (
    <LoginViewContainer>
      <Stack gap="lg">
        <Title order={3}>
          <Trans>Instagram Authentication</Trans>
        </Title>

        {account.isLoggedIn && loggedInAs && (
          <Alert color="green" icon={<IconCheck size={16} />}>
            <Stack gap="xs">
              <Text>
                <Trans>Successfully logged in as @{loggedInAs}</Trans>
              </Text>
              {tokenExpiry && (
                <Text size="xs" c="dimmed">
                  <Trans>
                    Token expires:{' '}
                    {new Date(tokenExpiry).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Trans>
                </Text>
              )}
              {apiType === 'unified' ? (
                <Text size="xs" c="dimmed">
                  <Trans>
                    To renew this Unified Login token, repeat Step 4: Generate
                    and copy your token in the setup guide below. Paste the new
                    access token into the Bearer Token field and click Log In.
                  </Trans>
                </Text>
              ) : (
                <Button
                  variant="light"
                  size="compact-sm"
                  color="blue"
                  loading={isRefreshing}
                  disabled={isSubmitting || isForgetting}
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
              )}
            </Stack>
          </Alert>
        )}

        {account.isLoggedIn && (
          <Stack gap="xs">
            <Button
              color="red"
              variant="light"
              loading={isForgetting}
              disabled={isSubmitting || isRefreshing || account.isPending}
              onClick={() => {
                setIsForgetting(true);
                accountApi
                  .clear(account.accountId)
                  .then(() => {
                    setAccessToken('');
                    setLoggedInAs(undefined);
                    setTokenExpiry(undefined);
                    setApiType(undefined);
                    showSuccessNotification(
                      <Trans>Instagram token forgotten</Trans>,
                    );
                  })
                  .catch(
                    createLoginHttpErrorHandler(
                      <Trans>Failed to forget token</Trans>,
                    ),
                  )
                  .finally(() => setIsForgetting(false));
              }}
            >
              <Trans>Forget Token</Trans>
            </Button>
            <Text size="xs" c="dimmed">
              <Trans>
                This removes the token from PostyBirb. It does not revoke it at
                Meta.
              </Trans>
            </Text>
          </Stack>
        )}

        <InstagramSetupGuide />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setIsSubmitting(true);
            websitesApi
              .performOAuthStep<InstagramOAuthRoutes, 'setAccessToken'>(
                id,
                'setAccessToken',
                { accessToken },
              )
              .then((res) => {
                if (res.success) {
                  setAccessToken('');
                  setLoggedInAs(res.igUsername);
                  setTokenExpiry(undefined);
                  setApiType(res.apiType);
                  notifyLoginSuccess(account);
                } else {
                  notifyLoginFailed(res.message);
                }
              })
              .catch(
                createLoginHttpErrorHandler(
                  <Trans>Failed to log in to Instagram</Trans>,
                ),
              )
              .finally(() => setIsSubmitting(false));
          }}
        >
          <Stack gap="md">
            <Text size="sm">
              <Trans>
                Enter an Instagram bearer token for a Business or Creator
                account. This token will be stored and used for all Instagram
                features.
              </Trans>
            </Text>
            <PasswordInput
              label={<Trans>Bearer Token</Trans>}
              description={
                <Trans>
                  Paste the token with or without the Bearer prefix.
                </Trans>
              }
              autoComplete="off"
              required
              disabled={isForgetting}
              value={accessToken}
              onChange={(event) => setAccessToken(event.currentTarget.value)}
            />
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!accessToken.trim() || isRefreshing || isForgetting}
            >
              <Trans>Log In</Trans>
            </Button>
          </Stack>
        </form>
      </Stack>
    </LoginViewContainer>
  );
}
