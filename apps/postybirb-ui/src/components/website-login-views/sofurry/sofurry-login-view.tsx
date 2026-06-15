import { Trans } from '@lingui/react/macro';
import { Alert, Box, Button, Stack, Text, TextInput } from '@mantine/core';
import { SofurryAccountData, SofurryOAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../../api/websites.api';
import { ExternalLink } from '../../shared/external-link';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'sofurry-login-form';

export default function SofurryLoginView(
  props: LoginViewProps<SofurryAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;
  const [token, setToken] = useState(data?.token ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  return (
    <LoginViewContainer>
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          websitesApi
            .performOAuthStep<SofurryOAuthRoutes>(id, 'login', {
              token: token.trim(),
            })
            .then(({ result }) => {
              if (result) {
                notifyLoginSuccess(undefined, account);
              } else {
                notifyLoginFailed();
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
                SoFurry uses a Personal Access Token (PAT) to authenticate
                PostyBirb with its public API.
              </Trans>
            </Text>
          </Alert>

          <TextInput
            // eslint-disable-next-line lingui/no-unlocalized-strings
            label="Access Token"
            name="password"
            type="password"
            // eslint-disable-next-line lingui/no-unlocalized-strings
            placeholder="Your personal access token"
            description={
              <Text size="xs" c="dimmed">
                <Trans comment="SoFurry login form">
                  Generate a Personal Access Token from your{' '}
                  <ExternalLink href="https://www.sofurry.com/settings/pat-create">
                    account settings
                  </ExternalLink>
                </Trans>
              </Text>
            }
            required
            minLength={1}
            value={token}
            onChange={(event) => {
              setToken(event.currentTarget.value);
            }}
          />

          <Box mt="md">
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={!token}
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
