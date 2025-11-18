import { Trans } from "@lingui/react/macro";
import {
  Box,
  Button,
  Checkbox,
  NumberInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { DiscordAccountData } from '@postybirb/types';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import { ExternalLink } from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';
import {
  createLoginHttpErrorHander,
  notifyLoginSuccess,
} from '../website-login-helpers';

const formId = 'discord-login-form';

const isStringValid = (str: string): boolean | undefined => {
  if (str === '') {
    return undefined;
  }

  // Account name must be provided and greater than 0 characters (trimmed)
  try {
    // eslint-disable-next-line no-new
    new URL(str);
    if (str && str.length) {
      if (str.trim().length > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export default function DiscordLoginView(
  props: LoginComponentProps<DiscordAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [webhook, setWebhook] = useState<string>(data?.webhook ?? '');
  const [serverLevel, setServerLevel] = useState<number>(
    data?.serverLevel ?? 0,
  );
  const [isForum, setIsForum] = useState<boolean>(data?.isForum ?? false);
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
              serverLevel,
              isForum,
            },
          })
          .then(() => {
            notifyLoginSuccess();
          })
          .catch(createLoginHttpErrorHander())
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
          defaultValue={webhook}
          error={
            isWebhookValid === false ? <Trans>Webhook is required</Trans> : null
          }
          description={
            <ExternalLink href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks">
              <Trans context="discord.webhook-help">
                How to create a webhook
              </Trans>
            </ExternalLink>
          }
          onBlur={(event) => {
            setWebhook(event.currentTarget.value.trim());
          }}
        />
        <NumberInput
          label={<Trans>Server Level</Trans>}
          defaultValue={serverLevel}
          min={0}
          max={3}
          description={
            <ExternalLink href="https://support.discord.com/hc/en-us/articles/360028038352-Server-Boosting-FAQ#h_419c3bd5-addd-4989-b7cf-c7957ef92583">
              <Trans>Server level perks</Trans>
            </ExternalLink>
          }
          onBlur={(event) => {
            setServerLevel(event.currentTarget.valueAsNumber);
          }}
        />
        <Checkbox
          label={<Trans>Is a forum</Trans>}
          checked={isForum}
          onChange={(event) => {
            setIsForum(event.currentTarget.checked);
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
