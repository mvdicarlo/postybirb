import { Trans } from "@lingui/react/macro";
import { Box, Button, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { E621AccountData, E621OAuthRoutes } from '@postybirb/types';
import { useState } from 'react';
import websitesApi from '../../api/websites.api';
import { ExternalLink } from '../../components/external-link/external-link';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';

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
            username,
            key,
          })
          .then(({ result }) => {
            if (result) {
              notifications.show({
                title: 'Login success.',
                message: 'Login success.',
                color: 'green',
              });
              setKey('');
            } else {
              notifications.show({
                title: 'Login failed.',
                message: 'Check that username and API Key are valid.',
                color: 'red',
              });
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
      <Stack>
        <TextInput
          label={<Trans>Username</Trans>}
          name="username"
          required
          minLength={1}
          defaultValue={username}
          onBlur={(event) => {
            setUsername(event.currentTarget.value.trim());
          }}
        />
        <TextInput
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label="API Key"
          name="password"
          description={
            <ExternalLink href="https://e621.net/users/home">
              <Trans comment="E621 login form">
                You must first get an API Key in your account settings [Manage
                API Access]
              </Trans>
            </ExternalLink>
          }
          required
          minLength={1}
          defaultValue={key}
          onBlur={(event) => {
            setKey(event.currentTarget.value.trim());
          }}
        />
        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!username || !key}
          >
            <Trans>Save</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
