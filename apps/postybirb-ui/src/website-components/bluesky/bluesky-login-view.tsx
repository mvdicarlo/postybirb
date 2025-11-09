import { Trans } from "@lingui/react/macro";
import { Box, Button, Stack, Text, TextInput } from '@mantine/core';
import { BlueskyAccountData, BlueskyOAuthRoutes } from '@postybirb/types';
import { useState } from 'react';
import websitesApi from '../../api/websites.api';
import { ExternalLink } from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';
import {
  createLoginHttpErrorHander,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../website-login-helpers';

const formId = 'bluesky-login-form';

// Source: https://atproto.com/specs/handle
const usernameRegexp =
  /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export default function BlueskyLoginView(
  props: LoginComponentProps<BlueskyAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [username, setUsername] = useState(data?.username ?? '');
  const [password, setPassword] = useState(data?.password ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const isUsingEmail = username.includes('@') && !username.startsWith('@');

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        websitesApi
          .performOAuthStep<BlueskyOAuthRoutes>(id, 'login', {
            username,
            password,
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
          .catch(createLoginHttpErrorHander())
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      <Stack>
        <TextInput
          label={<Trans>Username or email</Trans>}
          name="username"
          description={
            <>
              <Text inherit>
                <Trans>
                  Your handle - for example yourname.bsky.social or username.ext
                </Trans>
              </Text>
              <strong>
                <Trans>
                  If handle does not work, try using email linked to your
                  account instead
                </Trans>
              </strong>
            </>
          }
          required
          minLength={1}
          defaultValue={username}
          error={
            username &&
            !isUsingEmail &&
            !usernameRegexp.test(username) && (
              <Trans comment="Bluesky login form">
                Be sure that the username is in the format handle.bsky.social.
                If you are using custom domain, make sure to include full
                username, e.g. domain.ext, handle.domain.ext
              </Trans>
            )
          }
          onBlur={(event) => {
            // Remove spaces and leading @
            setUsername(event.currentTarget.value.trim().replace(/^@/, ''));
          }}
        />
        <TextInput
          label={<Trans>Password</Trans>}
          name="password"
          description={
            <Trans comment="Bluesky login form">
              An <strong>app</strong> password - you can get one of these in{' '}
              <ExternalLink href="https://bsky.app/settings/app-passwords">
                Settings
              </ExternalLink>
            </Trans>
          }
          required
          minLength={1}
          defaultValue={password}
          error={
            password &&
            !/^([a-z0-9]{4}-){3}[a-z0-9]{4}$/.test(password) && (
              <Trans comment="Bluesky login form">
                This doesn't look like an app password. You need to use an{' '}
                <em>app</em> password, <strong>not</strong> your account
                password! You can generate an app password in the Bluesky
                settings under the Advanced section.
              </Trans>
            )
          }
          onBlur={(event) => {
            setPassword(event.currentTarget.value.trim());
          }}
        />
        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!username || !password}
          >
            <Trans>Save</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
