import { Trans } from '@lingui/macro';
import { Box, Button, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FurtasticAccountLoginData } from '@postybirb/types';
import { IconLink, IconMail, IconPassword } from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import { ExternalLink } from '../../components/external-link/external-link';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';

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
    // eslint-disable-next-line lingui/no-unlocalized-strings
    console.error('Error testing API key:', error);
    return false;
  }
}

export default function FurtasticLoginView(
  props: LoginComponentProps<FurtasticAccountLoginData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [username, setUsername] = useState<string>(data?.username ?? '');
  const [apiKey, setApiKey] = useState<string>(data?.key ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isFormValid = username.trim().length > 0 && apiKey.trim().length > 0;

  return (
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
          notifications.show({
            title: <Trans>Invalid</Trans>,
            message: <Trans>Could not validate API Key</Trans>,
            color: 'red',
          });
          return;
        }

        accountApi
          .setWebsiteData<FurtasticAccountLoginData>({
            id,
            data: loginData,
          })
          .then(() => {
            notifications.show({
              title: <Trans>Account data updated</Trans>,
              message: (
                <Trans>Successfully saved Furtastic login information</Trans>
              ),
              color: 'green',
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
          label={<Trans>Username (email address)</Trans>}
          leftSection={<IconMail />}
          name="username"
          required
          minLength={1}
          defaultValue={username}
          error={
            username.trim().length === 0 ? (
              <Trans>Username is required</Trans>
            ) : null
          }
          onBlur={(event) => {
            setUsername(event.currentTarget.value.trim());
          }}
        />
        <TextInput
          label={<Trans>API Key</Trans>}
          leftSection={<IconPassword />}
          name="apiKey"
          type="password"
          required
          minLength={1}
          defaultValue={apiKey}
          error={
            apiKey.trim().length === 0 ? (
              <Trans>API Key is required</Trans>
            ) : null
          }
          description={
            <ExternalLink href="https://furtastic.art/account">
              <Trans context="furtastic.api-key-help">
                You must first get an API Key from your account settings [Manage
                API Access] <IconLink />
              </Trans>
            </ExternalLink>
          }
          onBlur={(event) => {
            setApiKey(event.currentTarget.value.trim());
          }}
        />
        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isFormValid}
          >
            <Trans>Save</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
