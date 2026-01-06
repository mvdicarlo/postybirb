import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { BlueskyAccountData, BlueskyOAuthRoutes } from '@postybirb/types';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { CommonTranslations } from '../../../../translations/common-translations';
import websitesApi from '../../../api/websites.api';
import { ExternalLink } from '../../shared/external-link';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'bluesky-login-form';

// Source: https://atproto.com/specs/handle
const usernameRegexp =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

function safeUrlParse(url: string) {
  try {
    return new URL(url);
  } catch (e) {
    // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
    console.error(`bsky login page custom url parse error "${url}"`, e);
    return undefined;
  }
}

export default function BlueskyLoginView(
  props: LoginViewProps<BlueskyAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;
  const [username, setUsername] = useState(data?.username ?? '');
  const [password, setPassword] = useState(data?.password ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const isUsingEmail = username.includes('@') && !username.startsWith('@');

  const [isUsingCustomPdsOrAppView, setIsUsingCustomPdsOrAppView] =
    useState<boolean>(!!data?.serviceUrl || !!data?.appViewUrl);
  const [customPds, setCustomPds] = useState(data?.serviceUrl ?? '');
  const [appViewUrl, setAppViewUrl] = useState(data?.appViewUrl ?? '');

  return (
    <LoginViewContainer>
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          websitesApi
            .performOAuthStep<BlueskyOAuthRoutes>(id, 'login', {
              username: username.trim().replace(/^@/, ''),
              password: password.trim(),
              serviceUrl: customPds || undefined, // Don't pass empty string
              appViewUrl: appViewUrl || undefined,
            })
            .then(({ result }) => {
              if (result) {
                notifyLoginSuccess();
                setPassword('');
              } else {
                notifyLoginFailed(
                  <Trans>
                    Check that handle and password are valid or try using email
                    instead of handle.
                  </Trans>,
                );
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
                Use your Bluesky handle or email along with an app password. App
                passwords are more secure than your main password and can be
                revoked at any time.
              </Trans>
            </Text>
          </Alert>

          <Switch
            checked={isUsingCustomPdsOrAppView}
            onChange={(v) => setIsUsingCustomPdsOrAppView(v.target.checked)}
            label={<Trans>Custom PDS or AppView</Trans>}
          />

          {isUsingCustomPdsOrAppView && (
            <TextInput
              label={<Trans>PDS (Personal Data Server)</Trans>}
              name="pds"
              placeholder="https://bsky.social"
              description={
                <Text size="xs" c="dimmed">
                  <Trans>If you are using pds other then bsky.social</Trans>
                </Text>
              }
              minLength={1}
              value={customPds}
              error={
                customPds &&
                !safeUrlParse(customPds) && (
                  <Group gap="xs">
                    <IconAlertCircle size={14} />
                    <Text size="xs">
                      <Trans comment="Bluesky login form">
                        Invalid url. Format should be{' '}
                        <code>https://bsky.social/</code>
                      </Trans>
                    </Text>
                  </Group>
                )
              }
              onChange={(event) => {
                let url = event.currentTarget.value;
                if (!customPds && !url.includes(':')) url = `https://${url}`;
                setCustomPds(url === 'https://bsky.social/' ? '' : url);
              }}
            />
          )}

          {isUsingCustomPdsOrAppView && (
            <TextInput
              label={<Trans>App view URL</Trans>}
              name="appView"
              placeholder="https://bsky.app"
              description={
                <Text size="xs" c="dimmed">
                  <Trans>
                    Used for other sites (like e621) as source url base.
                    Independent from custom pds.
                  </Trans>
                </Text>
              }
              minLength={1}
              value={appViewUrl}
              error={
                appViewUrl &&
                !safeUrlParse(appViewUrl) && (
                  <Group gap="xs">
                    <IconAlertCircle size={14} />
                    <Text size="xs">
                      <Trans comment="Bluesky login form">
                        Invalid url. Format should be{' '}
                        <code>https://bsky.app/</code>
                      </Trans>
                    </Text>
                  </Group>
                )
              }
              onChange={(event) => {
                let url = event.currentTarget.value;
                if (!appViewUrl && !url.includes(':')) url = `https://${url}`;
                setAppViewUrl(url === 'https://bsky.app/' ? '' : url);
              }}
            />
          )}

          <TextInput
            label={<Trans>Username or Email</Trans>}
            name="username"
            placeholder="yourname.bsky.social"
            description={
              <>
                <Text size="xs" c="dimmed">
                  <Trans>
                    Your handle (e.g. <code>yourname.bsky.social</code>) or
                    custom domain (e.g. <code>username.ext</code>)
                  </Trans>
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  <Trans>
                    <strong>Tip:</strong> If your handle doesn't work, try using
                    the email linked to your account
                  </Trans>
                </Text>
              </>
            }
            required
            minLength={1}
            value={username}
            error={
              username &&
              !isUsingEmail &&
              !usernameRegexp.test(username) && (
                <Group gap="xs">
                  <IconAlertCircle size={14} />
                  <Text size="xs">
                    <Trans comment="Bluesky login form">
                      Format should be <code>handle.bsky.social</code> or{' '}
                      <code>domain.ext</code> for custom domains
                    </Trans>
                  </Text>
                </Group>
              )
            }
            onChange={(event) => {
              setUsername(event.currentTarget.value);
            }}
          />

          <TextInput
            label={<Trans>App Password</Trans>}
            name="password"
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            description={
              <>
                <Text size="xs" c="dimmed">
                  <Trans comment="Bluesky login form">
                    An <strong>app password</strong> (not your main password)
                  </Trans>
                </Text>
                <ExternalLink href="https://bsky.app/settings/app-passwords">
                  <Trans>Create an app password in Bluesky Settings</Trans>
                </ExternalLink>
              </>
            }
            required
            minLength={1}
            value={password}
            error={password && !/^([a-z0-9]{4}-){3}[a-z0-9]{4}$/.test(password)}
            onChange={(event) => {
              setPassword(event.currentTarget.value);
            }}
          />

          <Box mt="md">
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={!username || !password}
              fullWidth
            >
              <CommonTranslations.Save />
            </Button>
          </Box>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
