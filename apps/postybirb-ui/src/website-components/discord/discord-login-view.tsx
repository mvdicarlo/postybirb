import { Trans } from '@lingui/macro';
import { Box, Button, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';

type DiscordAccountData = {
  webhook: string;
};

const formId = 'discord-login-form';

const isStringValid = (str: string): boolean | undefined => {
  if (str === '') {
    return undefined;
  }

  // Account name must be provided and greater than 0 characters (trimmed)
  if (str && str.length) {
    if (str.trim().length > 0) {
      return true;
    }
  }

  return false;
};

export default function DiscordLoginView(
  props: LoginComponentProps<DiscordAccountData>
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [webhook, setWebhook] = useState<string>(data?.webhook ?? '');
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const isWebhookValid = isStringValid(webhook);

  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        accountApi
          .setWebsiteData<DiscordAccountData>({
            id,
            data: {
              webhook,
            },
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
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label="Webhook"
          name="webhook"
          required
          minLength={1}
          value={webhook}
          error={
            isWebhookValid === false ? <Trans>Webhook is required</Trans> : null
          }
          description={
            <a href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks">
              <Trans context="discord.webhook-help">
                How to create a webhook
              </Trans>
            </a>
          }
          onChange={(event) => {
            setWebhook(event.currentTarget.value);
          }}
        />
        <Box>
          <Button
            type="submit"
            form={formId}
            loading={isSubmitting}
            disabled={!isWebhookValid}
          >
            <Trans>Save</Trans>
          </Button>
        </Box>
      </Stack>
    </form>
  );
}
