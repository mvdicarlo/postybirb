import { Trans } from '@lingui/macro';
import { Box, Button, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BlueskyAccountData } from '@postybirb/types';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';

const formId = 'bluesky-login-form';

export default function BlueskyLoginView(
  props: LoginComponentProps<BlueskyAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [username, setUsername] = useState(data?.username ?? '');
  const [password, setPassword] = useState(data?.password ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        accountApi
          .setWebsiteData<BlueskyAccountData>({
            id,
            data: { username, password, folders: [] },
          })
          .then(() => {
            notifications.show({
              title: 'Account data updated.',
              message: 'Account data updated.',
              color: 'success',
            });
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
      <Stack>
        <TextInput
          label={<Trans>Username</Trans>}
          name="username"
          description={
            <Trans>Your DID or handle - for example yourname.bsky.social</Trans>
          }
          required
          minLength={1}
          defaultValue={username}
          error={
            <>
              {username.startsWith('@') && (
                <Trans comment="Bluesky login form">
                  You don't need to input the @. Unless your username{' '}
                  <strong>really</strong> contains it
                </Trans>
              )}
              {username && !username.includes('.') && (
                <Trans comment="Bluesky login form">
                  Be sure that the username is in the format handle.bsky.social.
                  Or if you are using custom domain, make sure to include full
                  username, e.g. domain.ext, handle.domain.ext
                </Trans>
              )}
            </>
          }
          onBlur={(event) => {
            setUsername(event.currentTarget.value.trim());
          }}
        />
        <TextInput
          label={<Trans>Password</Trans>}
          name="password"
          description={
            <Trans comment="Bluesky login form">
              An <strong>app</strong> password - you can get one of these in
              Settings
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
