import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { Trans } from '@lingui/macro';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import { useToast } from '../../app/app-toast-provider';
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
  const { addToast } = useToast();

  const isWebhookValid = isStringValid(webhook);

  return (
    <EuiForm
      id={formId}
      component="form"
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
            addToast({
              id,
              color: 'success',
              text: <Trans>Account data updated.</Trans>,
            });
          })
          .catch(({ error }: { error: HttpErrorResponse }) => {
            addToast({
              id,
              text: <span>{error.message}</span>,
              title: (
                <span>
                  {error.statusCode} {error.error}
                </span>
              ),
              color: 'danger',
            });
          })
          .finally(() => {
            setSubmitting(false);
          });
      }}
    >
      <EuiFormRow
        // eslint-disable-next-line lingui/no-unlocalized-strings
        label="Webhook"
        helpText={
          <EuiLink
            href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
            external
          >
            <Trans context="discord.webhook-help">
              How to create a webhook
            </Trans>
          </EuiLink>
        }
      >
        <EuiFieldText
          name="webhook"
          required
          value={webhook}
          minLength={1}
          isInvalid={!isWebhookValid}
          onChange={(event) => {
            setWebhook(event.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiButton
          fill
          type="submit"
          form={formId}
          isLoading={isSubmitting}
          disabled={!isWebhookValid}
        >
          <Trans>Save</Trans>
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
}
