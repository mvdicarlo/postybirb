/**
 * Helper utilities for website login views.
 */

import { Trans } from '@lingui/react/macro';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react';
import type HttpErrorResponse from '../../models/http-error-response';
import { AccountRecord } from '../../stores';

/**
 * Show an info notification.
 */
export function notifyInfo(title: React.ReactNode, message: React.ReactNode) {
  notifications.show({
    title,
    message,
    color: 'blue',
    icon: <IconInfoCircle size={16} />,
  });
}

/**
 * Show a success notification for successful login and close login form for current website.
 */
export function notifyLoginSuccess(
  message: React.ReactNode | undefined,
  account: AccountRecord | undefined,
) {
  notifications.show({
    title: <Trans>{account?.websiteDisplayName}: Login successful</Trans>,
    color: 'green',
    message,
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show an error notification for failed login.
 */
export function notifyLoginFailed(message?: React.ReactNode) {
  notifications.show({
    title: <Trans>Login failed</Trans>,
    message: message ?? (
      <Trans>Please check your credentials and try again</Trans>
    ),
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for HTTP/network errors during login.
 */
export function notifyLoginError(error: Error) {
  notifications.show({
    title: <Trans>Connection error</Trans>,
    message: error.message || <Trans>Failed to connect to the server</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Create an error handler for HTTP errors during login operations.
 * Use this as a .catch() handler for API calls.
 */
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
      icon: <IconX size={16} />,
    });
  };
}
