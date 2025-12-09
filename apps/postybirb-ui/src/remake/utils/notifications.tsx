/**
 * Standardized notification messages for CRUD operations.
 * Reduces translation burden by using consistent message patterns.
 */

import { Trans } from '@lingui/react/macro';
import { notifications } from '@mantine/notifications';

/**
 * Show a generic success notification.
 */
export function showSuccessNotification(message: React.ReactNode) {
  notifications.show({
    message,
    color: 'green',
  });
}

/**
 * Show a success notification for item creation.
 */
export function showCreatedNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Created successfully</Trans>,
    color: 'green',
  });
}

/**
 * Show a success notification for item update.
 */
export function showUpdatedNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Updated successfully</Trans>,
    color: 'green',
  });
}

/**
 * Show a success notification for item deletion.
 * @param count - Number of items deleted
 */
export function showDeletedNotification(count = 1) {
  notifications.show({
    message:
      count === 1 ? (
        <Trans>Deleted successfully</Trans>
      ) : (
        <Trans>{count} items deleted</Trans>
      ),
    color: 'green',
  });
}

/**
 * Show an error notification for failed creation.
 */
export function showCreateErrorNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Failed to create</Trans>,
    color: 'red',
  });
}

/**
 * Show an error notification for failed update.
 */
export function showUpdateErrorNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Failed to update</Trans>,
    color: 'red',
  });
}

/**
 * Show an error notification for failed deletion.
 */
export function showDeleteErrorNotification() {
  notifications.show({
    message: <Trans>Failed to delete</Trans>,
    color: 'red',
  });
}

/**
 * Show a generic error notification.
 */
export function showErrorNotification(message?: React.ReactNode) {
  notifications.show({
    title: <Trans>Error</Trans>,
    message: message ?? <Trans>An error occurred</Trans>,
    color: 'red',
  });
}
