/**
 * Helper utilities for website login views.
 */

import { Trans } from '@lingui/react/macro';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';

/**
 * Show a success notification for successful login.
 */
export function notifyLoginSuccess(message?: React.ReactNode) {
  notifications.show({
    message: message ?? <Trans>Login successful</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show an error notification for failed login.
 */
export function notifyLoginFailed(message?: React.ReactNode) {
  notifications.show({
    title: <Trans>Login failed</Trans>,
    message: message ?? <Trans>Please check your credentials and try again</Trans>,
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
