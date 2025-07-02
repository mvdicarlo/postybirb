import { Trans } from '@lingui/macro';
import {
    Alert,
    Box,
    Button,
    PasswordInput,
    Stack,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { InkbunnyAccountData } from '@postybirb/types';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import { ExternalLink } from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';

const formId = 'inkbunny-login-form';

export default function InkbunnyLoginView(
  props: LoginComponentProps<InkbunnyAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [username, setUsername] = useState<string>(data?.username ?? '');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isFormValid = username.trim().length > 0 && password.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);

    try {
      // Authenticate with Inkbunny API
      const authResponse = await fetch(
        `https://inkbunny.net/api_login.php?username=${encodeURIComponent(
          username.trim(),
        )}&password=${encodeURIComponent(password)}`,
        {
          method: 'GET',
        },
      );

      const authData = await authResponse.json();

      if (authData.sid) {
        // Save the authentication data
        await accountApi.setWebsiteData<InkbunnyAccountData>({
          id,
          data: {
            username: username.trim(),
            sid: authData.sid,
          },
        });

        notifications.show({
          title: <Trans>Login successful</Trans>,
          message: <Trans>Successfully logged into Inkbunny</Trans>,
          color: 'green',
        });
      } else {
        throw new Error(authData.error_message);
      }
    } catch (error) {
      notifications.show({
        title: <Trans>Login failed</Trans>,
        message: (error as Error).message,
        color: 'red',
      });
    } finally {
      setSubmitting(false);
      setPassword(''); // Clear password for security
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Stack>
        <Alert color="blue">
          <Trans>
            You must first enable API access in your{' '}
            <ExternalLink href="https://inkbunny.net/account.php">
              account settings
            </ExternalLink>{' '}
            under "API (External Scripting)".
          </Trans>
        </Alert>

        <TextInput
          label={<Trans>Username</Trans>}
          name="username"
          required
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
        />

        <PasswordInput
          label={<Trans>Password</Trans>}
          name="password"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />

        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isFormValid}
          >
            <Trans>Login</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
