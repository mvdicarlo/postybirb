import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Group,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { DiscordAccountData } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../../api/account.api';
import { ExternalLink } from '../../shared/external-link';
import { createLoginHttpErrorHandler, notifyLoginSuccess } from '../helpers';
import { LoginViewContainer } from '../login-view-container';
import type { LoginViewProps } from '../types';

const formId = 'discord-login-form';

const isWebhookValid = (str: string): boolean | undefined => {
  if (str === '') {
    return undefined;
  }

  try {
    const url = new URL(str);
    // Discord webhook URLs follow pattern: https://discord.com/api/webhooks/{id}/{token}
    const isDiscordWebhook =
      (url.hostname === 'discord.com' || url.hostname === 'discordapp.com') &&
      url.pathname.startsWith('/api/webhooks/');

    return isDiscordWebhook && str.trim().length > 0;
  } catch {
    return false;
  }
};

export default function DiscordLoginView(
  props: LoginViewProps<DiscordAccountData>,
): JSX.Element {
  const { account, data } = props;
  const { id } = account;
  const [webhook, setWebhook] = useState<string>(data?.webhook ?? '');
  const [serverLevel, setServerLevel] = useState<number>(
    data?.serverLevel ?? 0,
  );
  const [isForum, setIsForum] = useState<boolean>(data?.isForum ?? false);
  const [isSubmitting, setSubmitting] = useState<boolean>(false);

  const webhookValid = isWebhookValid(webhook);

  return (
    <LoginViewContainer>
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          accountApi
            .setWebsiteData<DiscordAccountData>({
              id,
              data: { webhook: webhook.trim(), serverLevel, isForum },
            })
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
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">
              <Trans>
                PostyBirb uses Discord webhooks to post content to your server.
                Make sure you have the necessary permissions to create webhooks
                in your target channel.
              </Trans>
            </Text>
          </Alert>

          <TextInput
            // eslint-disable-next-line lingui/no-unlocalized-strings
            label="Webhook URL"
            name="webhook"
            placeholder="https://discord.com/api/webhooks/..."
            required
            minLength={1}
            value={webhook}
            error={webhookValid === false}
            description={
              <ExternalLink href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks">
                <Trans context="discord.webhook-help">
                  How to create a webhook
                </Trans>
              </ExternalLink>
            }
            onChange={(event) => {
              setWebhook(event.currentTarget.value);
            }}
          />

          <Box>
            <Text size="sm" fw={500} mb={4}>
              <Trans>Server Boost Level</Trans>
            </Text>
            <SegmentedControl
              fullWidth
              value={String(serverLevel)}
              onChange={(value) => setServerLevel(Number(value))}
              data={[
                { value: '0', label: <Trans>None</Trans> },
                { value: '1', label: <Trans>Level 1</Trans> },
                { value: '2', label: <Trans>Level 2</Trans> },
                { value: '3', label: <Trans>Level 3</Trans> },
              ]}
            />
            <Text size="xs" c="dimmed" mt={4}>
              <Trans>Higher boost levels allow larger file uploads</Trans>
            </Text>
          </Box>

          <Checkbox
            label={
              <Group gap="xs">
                <Text size="sm">
                  <Trans>This is a forum channel</Trans>
                </Text>
              </Group>
            }
            checked={isForum}
            onChange={(event) => {
              setIsForum(event.currentTarget.checked);
            }}
          />

          <Box mt="md">
            <Button
              type="submit"
              form={formId}
              loading={isSubmitting}
              disabled={!webhookValid}
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
