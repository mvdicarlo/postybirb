import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  NumberInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { TelegramAccountData, TelegramOAuthRoutes } from '@postybirb/types';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import websitesApi from '../../api/websites.api';
import { ExternalLink } from '../../components/external-link/external-link';
import { LoginComponentProps } from '../../models/login-component-props';
import {
  createLoginHttpErrorHandler,
  notifyLoginFailed,
  notifyLoginSuccess,
} from '../website-login-helpers';

export default function TelegramLoginView(
  props: LoginComponentProps<TelegramAccountData>,
): JSX.Element {
  const { account } = props;
  const { data, id } = account;
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber ?? '');
  const [appHash, setAppHash] = useState(data.appHash ?? '');
  const [appId, setAppId] = useState(data.appId);
  const [code, setCode] = useState('');
  const [displayCodeDialog, setDisplayCodeDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [codeInvalid, setCodeInvalid] = useState(false);

  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const isValid = !!appId && !!appHash && !!phoneNumber;

  return (
    <>
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <Trans>
              Telegram requires API credentials and phone number authentication.
              You'll need to create a Telegram app and verify your phone number.
            </Trans>
          </Text>
        </Alert>

        <NumberInput
          label={<Trans>App API ID</Trans>}
          name="appId"
          required
          minLength={1}
          defaultValue={appId || undefined}
          description={
            <ExternalLink href="https://core.telegram.org/myapp">
              <Trans context="telegram.app-id-help">
                Create telegram app to retrieve api_id and api_hash
              </Trans>
            </ExternalLink>
          }
          onChange={(event) => {
            setAppId(Number(event));
          }}
        />

        <TextInput
          label={<Trans>App API Hash</Trans>}
          required
          defaultValue={appHash}
          minLength={1}
          onBlur={(event) => {
            setAppHash(event.currentTarget.value.trim());
          }}
        />

        <TextInput
          label={<Trans>Phone Number</Trans>}
          defaultValue={phoneNumber}
          required
          description={
            <ExternalLink href="https://developers.omnisend.com/guides/e164-phone-number-formatting">
              <Trans context="telegram.phone-number-help">
                Phone number must be in international format
              </Trans>
            </ExternalLink>
          }
          onChange={(event) => {
            setPhoneNumber(event.currentTarget.value.replace(/[^0-9+]/g, ''));
          }}
        />

        <Box mt="md">
          <Button
            loading={isSendingCode}
            disabled={!isValid}
            fullWidth
            onClick={(event) => {
              event.preventDefault();
              setIsSendingCode(true);

              websitesApi
                .performOAuthStep<TelegramOAuthRoutes>(
                  id,
                  'startAuthentication',
                  { appId, phoneNumber, appHash },
                )
                .catch(
                  createLoginHttpErrorHandler(
                    <Trans>Failed to send code to begin authentication</Trans>,
                  ),
                )
                .then(() => {
                  setDisplayCodeDialog(true);
                  notifications.show({
                    title: <Trans>Code sent</Trans>,
                    message: <Trans>Check your telegram messages</Trans>,
                  });
                })
                .finally(() => setIsSendingCode(false));
            }}
          >
            <Trans>Send Code</Trans>
          </Button>
        </Box>
      </Stack>

      {displayCodeDialog && (
        <Stack gap="md">
          <TextInput
            label={<Trans>Code</Trans>}
            autoFocus
            required
            value={code}
            error={
              codeInvalid && (
                <Trans>
                  Code invalid, ensure it matches the code sent from telegram
                </Trans>
              )
            }
            onChange={(event) => {
              setCodeInvalid(false);
              setCode(event.currentTarget.value.trim());
            }}
            minLength={1}
          />

          <TextInput
            label={<Trans>Cloud Password</Trans>}
            type="password"
            defaultValue={password}
            error={passwordInvalid && <Trans>Password is invalid</Trans>}
            minLength={1}
            description={
              passwordRequired ? (
                <Trans>
                  2FA enabled, password required. It won't be stored.
                </Trans>
              ) : (
                <Trans>Required if 2FA is enabled.</Trans>
              )
            }
            required={passwordRequired}
            onBlur={(event) => {
              setPasswordInvalid(false);
              setPassword(event.currentTarget.value.trim());
            }}
          />

          <Box mt="md">
            <Button
              loading={isAuthenticating}
              disabled={!code}
              fullWidth
              onClick={() => {
                submit();

                function submit() {
                  setIsAuthenticating(true);
                  websitesApi
                    .performOAuthStep<TelegramOAuthRoutes>(id, 'authenticate', {
                      appHash,
                      appId,
                      phoneNumber,
                      password,
                      code,
                    })
                    .then((res) => {
                      if (!res) return;

                      if (res.success) {
                        notifyLoginSuccess();
                        setPassword('');
                        setIsAuthenticating(false);
                      } else {
                        if (res.passwordRequired) {
                          setPasswordRequired(true);

                          // Send new code without closing dialog
                          // Don't do it without immediate because isAuthenticated will be overriden by Promise.finally
                          setImmediate(submit);
                        }

                        if (res.passwordInvalid) {
                          setPasswordInvalid(true);
                        }

                        // For some reason if password is required it replies with both errors
                        if (res.codeInvalid && !res.passwordInvalid) {
                          setCodeInvalid(true);
                        }

                        notifyLoginFailed(res.message);
                      }
                    })
                    .catch(
                      createLoginHttpErrorHandler(
                        <Trans>Error while authenticating Telegram</Trans>,
                      ),
                    )
                    .finally(() => {
                      setCode('');
                      setIsAuthenticating(false);
                    });
                }
              }}
            >
              <Trans>Authenticate</Trans>
            </Button>
          </Box>
        </Stack>
      )}
    </>
  );
}
