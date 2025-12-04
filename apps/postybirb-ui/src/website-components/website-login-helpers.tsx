import { Trans } from '@lingui/react/macro';
import { notifications } from '@mantine/notifications';
import React from 'react';
import HttpErrorResponse from '../models/http-error-response';

export function notifyLoginSuccess(message?: React.ReactNode) {
  notifications.show({
    color: 'green',
    title: <Trans>Login success</Trans>,
    message: message ?? <Trans>You can close this menu now</Trans>,
  });
}

export function notifyLoginFailed(message?: React.ReactNode) {
  notifications.show({
    color: 'red',
    title: <Trans>Login failed</Trans>,
    message: message ?? (
      <Trans>Check that provided credentials are valid</Trans>
    ),
  });
}

export function createLoginHttpErrorHandler(action?: React.ReactNode) {
  return ({ error }: { error: HttpErrorResponse }) => {
    notifications.show({
      title: (
        <span>
          {action ?? <Trans>Login failed</Trans>}: {error.statusCode}{' '}
          {error.error}
        </span>
      ),
      message: error.message,
      color: 'red',
    });
  };
}
