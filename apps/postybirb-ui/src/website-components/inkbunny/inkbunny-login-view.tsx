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
import { InkbunnyAccountData, InkbunnyOAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../api/websites.api';
import { ExternalLink } from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';
import { CommonTranslations } from '../../translations/common-translations';
import {
  createLoginHttpErrorHandler,
  notifyLoginSuccess,
} from '../website-login-helpers';

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

    // Authenticate via backend to avoid CORS issues
    // Password is only sent to Inkbunny API, never stored
    websitesApi
      .performOAuthStep<InkbunnyOAuthRoutes>(id, 'login', {
        username: username.trim(),
        password,
      })
      .then(() => {
        notifyLoginSuccess();
      })
      .catch(createLoginHttpErrorHandler())
      .finally(() => {
        setSubmitting(false);
        setPassword(''); // Clear password for security
      });
  };

  return (
    <form id={formId} onSubmit={handleSubmit}>
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
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
            <CommonTranslations.Save />
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
