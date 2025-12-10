import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Stack, Text, TextInput } from '@mantine/core';
import { FurtasticAccountLoginData } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../../api/account.api';
import { ExternalLink } from '../../shared/external-link';
import {
    createLoginHttpErrorHandler,
    notifyLoginFailed,
    notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'furtastic-login-form';

async function testApiKey(
  loginData: FurtasticAccountLoginData,
): Promise<boolean> {
  const { username, key: apiKey } = loginData;
  try {
    const response = await fetch(
      `https://api.furtastic.art/private/apiAuth?login=${encodeURIComponent(
        username,
      )}&api_key=${apiKey}`,
    );
    const data = await response.json();
    return data.status === true;
  } catch (error) {
    // eslint-disable-next-line lingui/no-unlocalized-strings, no-console
    console.error('Error testing API key:', error);
    return false;
  }
}

export default function FurtasticLoginView(
  props: LoginViewProps<FurtasticAccountLoginData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;
  const [username, setUsername] = useState<string>(data?.username ?? '');
  const [apiKey, setApiKey] = useState<string>(data?.key ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isFormValid = username.trim().length > 0 && apiKey.trim().length > 0;

  return (
    <LoginViewContainer>
      <form
        id={formId}
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);

        // Prepare the data to be sent
        const loginData: FurtasticAccountLoginData = {
          username: username.trim(),
          key: apiKey.trim(),
        };

        const isValid = await testApiKey(loginData);

        if (!isValid) {
          notifyLoginFailed();
          setSubmitting(false);
          return;
        }

        accountApi
          .setWebsiteData<FurtasticAccountLoginData>({ id, data: loginData })
          .then(() => {
            notifyLoginSuccess();
          })
          .catch(createLoginHttpErrorHandler())
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <Trans>
              Furtastic requires API credentials for posting. Use your email
              address and an API key from your account settings.
            </Trans>
          </Text>
        </Alert>

        <TextInput
          label={<Trans>Email</Trans>}
          name="username"
          type="email"
          placeholder="your-email@example.com"
          required
          minLength={1}
          value={username}
          onChange={(event) => {
            setUsername(event.currentTarget.value);
          }}
        />

        <TextInput
          label={<Trans>API Key</Trans>}
          name="apiKey"
          type="password"
          // eslint-disable-next-line lingui/no-unlocalized-strings
          placeholder="Your API key"
          description={
            <Text size="xs" c="dimmed">
              <Trans context="furtastic.api-key-help">
                Generate an API key from your{' '}
                <ExternalLink href="https://furtastic.art/account">
                  account settings
                </ExternalLink>
              </Trans>
            </Text>
          }
          required
          minLength={1}
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.currentTarget.value);
          }}
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
