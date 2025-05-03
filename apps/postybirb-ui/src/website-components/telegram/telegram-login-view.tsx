import { Trans } from '@lingui/macro';
import { Box, Button, NumberInput, Stack, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { TelegramAccountData, TelegramCustomRoutes } from '@postybirb/types';
import { IconLink } from '@tabler/icons-react';
import { useState } from 'react';
import accountApi from '../../api/account.api';
import { ExternalLink } from '../../components/external-link/external-link';
import HttpErrorResponse from '../../models/http-error-response';
import { LoginComponentProps } from '../../models/login-component-props';

function createErrorHandler(action: React.ReactNode) {
  return ({ error }: { error: HttpErrorResponse }) => {
    notifications.show({
      title: (
        <span>
          {action}: {error.statusCode} {error.error}
        </span>
      ),
      message: error.message,
      color: 'red',
    });
  };
}

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
      <Stack>
        <NumberInput
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label="App api_id"
          name="appId"
          required
          minLength={1}
          defaultValue={appId || undefined}
          description={
            <ExternalLink href="https://core.telegram.org/myapp">
              <Trans context="telegram.app-id-help">
                You must create your own app configuration <IconLink />
              </Trans>
            </ExternalLink>
          }
          onChange={(event) => {
            setAppId(Number(event));
          }}
        />
        <TextInput
          // eslint-disable-next-line lingui/no-unlocalized-strings
          label="App api_hash"
          required
          defaultValue={appHash}
          minLength={1}
          onBlur={(event) => {
            setAppHash(event.currentTarget.value.trim());
          }}
        />
        <TextInput
          label={<Trans>Phone Number (International Format)</Trans>}
          defaultValue={phoneNumber}
          required
          description={
            <ExternalLink href="https://developers.omnisend.com/guides/e164-phone-number-formatting">
              <Trans context="telegram.phone-number-help">
                Phone number must be in international format <IconLink />
              </Trans>
            </ExternalLink>
          }
          onChange={(event) => {
            setPhoneNumber(event.currentTarget.value.replace(/[^0-9+]/g, ''));
          }}
        />
        <Box>
          <Button
            loading={isSendingCode}
            disabled={!isValid}
            onClick={(event) => {
              event.preventDefault();
              setIsSendingCode(true);

              accountApi
                .customRoute<TelegramCustomRoutes>(id, 'startAuthentication', {
                  appId,
                  phoneNumber,
                  appHash,
                })
                .catch(
                  createErrorHandler(
                    <Trans>Failed to send code to begin authentication.</Trans>,
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
            <Trans>Send code</Trans>
          </Button>
        </Box>
      </Stack>
      {displayCodeDialog && (
        <Stack>
          <TextInput
            // eslint-disable-next-line lingui/no-unlocalized-strings
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
          <Box>
            <Button
              loading={isAuthenticating}
              disabled={!code}
              onClick={() => {
                submit();

                function submit() {
                  setIsAuthenticating(true);
                  accountApi
                    .customRoute<TelegramCustomRoutes>(id, 'authenticate', {
                      appHash,
                      appId,
                      phoneNumber,
                      password,
                      code,
                    })
                    .then((res) => {
                      if (!res) return;

                      if (res.success) {
                        notifications.show({
                          title: <Trans>Telegram authenticated.</Trans>,
                          message: <Trans>Success!</Trans>,
                          color: 'green',
                        });
                        setPassword('');
                        setIsAuthenticating(false);
                      } else {
                        if (res.passwordRequired) {
                          setPasswordRequired(true);

                          // Send new code without closing dialog
                          // Don't do it without immediate because isAuthenticated will be overriden by Promise.finally
                          setImmediate(submit);
                        }

                        if (res.passwordInvalid) setPasswordInvalid(true);

                        // For some reason if password is required it replies with both errors
                        if (res.codeInvalid && !res.passwordInvalid)
                          setCodeInvalid(true);

                        notifications.show({
                          title: (
                            <Trans>Failed to authenticate Telegram.</Trans>
                          ),
                          message: res.message || 'unknown',
                          color: 'red',
                        });
                      }
                    })
                    .catch(
                      createErrorHandler(
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
