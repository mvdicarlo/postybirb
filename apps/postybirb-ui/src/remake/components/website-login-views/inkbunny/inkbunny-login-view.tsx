/**
 * InkbunnyLoginView - Custom login form for Inkbunny.
 * Authenticates via the Inkbunny API and stores the session ID.
 */

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import type { InkbunnyAccountData } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../../api/account.api';
import { ExternalLink } from '../../shared/external-link';
import { notifyLoginFailed } from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'inkbunny-login-form';

export function InkbunnyLoginView({
  account,
  data,
  notifyLoginSuccess,
}: LoginViewProps<InkbunnyAccountData>) {
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
        { method: 'GET' },
      );

      const authData = await authResponse.json();

      if (authData.sid) {
        // Save the authentication data
        await accountApi.setWebsiteData<InkbunnyAccountData>({
          id: account.id,
          data: { username: username.trim(), sid: authData.sid },
        });

        notifyLoginSuccess();
      } else {
        throw new Error(authData.error_message);
      }
    } catch (error) {
      notifyLoginFailed((error as Error).message);
    } finally {
      setSubmitting(false);
      setPassword(''); // Clear password for security
    }
  };

  return (
    <LoginViewContainer>
      <form id={formId} onSubmit={handleSubmit}>
        <Stack gap="md">
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">
              <Trans>
                You must first enable API access in your account settings under
                "API (External Scripting)" before you can authenticate with
                PostyBirb.
              </Trans>
            </Text>
            <ExternalLink href="https://inkbunny.net/account.php">
              <Trans>Open Inkbunny Account Settings</Trans>
            </ExternalLink>
          </Alert>

          <TextInput
            label={<Trans>Username</Trans>}
            name="username"
            placeholder="your_username"
            required
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
          />

          <PasswordInput
            label={<Trans>Password</Trans>}
            name="password"
            // eslint-disable-next-line lingui/no-unlocalized-strings
            placeholder="Your password"
            required
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            description={
              <Text size="xs" c="dimmed">
                <Trans>Your password will not be stored</Trans>
              </Text>
            }
          />

          <Box mt="md">
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={!isFormValid}
              fullWidth
            >
              <Trans>Save</Trans>
            </Button>
          </Box>
        </Stack>
      </form>
    </LoginViewContainer>
  );
}
