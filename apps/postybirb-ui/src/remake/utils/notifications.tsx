/**
 * Standardized notification messages for CRUD operations and common actions.
 * Reduces translation burden by using consistent message patterns.
 * All notifications include consistent icons for visual clarity.
 */

import { Trans } from '@lingui/react/macro';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';

// -----------------------------------------------------------------------------
// Success Notifications
// -----------------------------------------------------------------------------

/**
 * Show a generic success notification.
 */
export function showSuccessNotification(message: React.ReactNode) {
  notifications.show({
    message,
    color: 'green',
    icon: <IconCheck size={16} />,
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
    icon: <IconCheck size={16} />,
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
    icon: <IconCheck size={16} />,
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
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for copying to clipboard.
 */
export function showCopiedNotification() {
  notifications.show({
    message: <Trans>Copied to clipboard</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for item duplication.
 */
export function showDuplicatedNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Duplicated successfully</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for restoring/unarchiving an item.
 */
export function showRestoredNotification() {
  notifications.show({
    message: <Trans>Restored successfully</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for file upload.
 */
export function showUploadSuccessNotification() {
  notifications.show({
    message: <Trans>Files uploaded successfully</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for successful connection.
 */
export function showConnectionSuccessNotification(message?: React.ReactNode) {
  notifications.show({
    message: message ?? <Trans>Connected successfully</Trans>,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

/**
 * Show a success notification for schedule updates.
 */
export function showScheduleUpdatedNotification(itemName?: string) {
  notifications.show({
    title: <Trans>Schedule updated</Trans>,
    message: itemName,
    color: 'green',
    icon: <IconCheck size={16} />,
  });
}

// -----------------------------------------------------------------------------
// Error Notifications
// -----------------------------------------------------------------------------

/**
 * Show an error notification for failed creation.
 */
export function showCreateErrorNotification(itemName?: string) {
  notifications.show({
    title: itemName,
    message: <Trans>Failed to create</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
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
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for failed deletion.
 */
export function showDeleteErrorNotification() {
  notifications.show({
    message: <Trans>Failed to delete</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
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
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification with title and message.
 * Useful for displaying API errors with status codes.
 */
export function showErrorWithTitleNotification(
  title: React.ReactNode,
  message: React.ReactNode
) {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification, extracting message from Error objects.
 * Handles the common pattern of `error instanceof Error ? error.message : fallback`.
 */
export function showErrorWithContext(
  error: unknown,
  fallbackMessage: React.ReactNode
) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  notifications.show({
    message,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show a notification for failed duplication.
 */
export function showDuplicateErrorNotification() {
  notifications.show({
    message: <Trans>Failed to duplicate</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show a notification for failed posting.
 */
export function showPostErrorNotification() {
  notifications.show({
    message: <Trans>Failed to post submission</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for failed restore/unarchive.
 */
export function showRestoreErrorNotification() {
  notifications.show({
    message: <Trans>Failed to restore</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for failed file upload.
 */
export function showUploadErrorNotification(message?: React.ReactNode) {
  notifications.show({
    message: message ?? <Trans>Failed to upload files</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for failed connection.
 */
export function showConnectionErrorNotification(
  title: React.ReactNode,
  message: React.ReactNode
) {
  notifications.show({
    title,
    message,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

/**
 * Show an error notification for failed save operation.
 */
export function showSaveErrorNotification(message?: React.ReactNode) {
  notifications.show({
    message: message ?? <Trans>Failed to save</Trans>,
    color: 'red',
    icon: <IconX size={16} />,
  });
}

// -----------------------------------------------------------------------------
// Info & Warning Notifications
// -----------------------------------------------------------------------------

/**
 * Show an informational notification.
 */
export function showInfoNotification(
  message: React.ReactNode,
  title?: React.ReactNode
) {
  notifications.show({
    title,
    message,
    color: 'blue',
    icon: <IconInfoCircle size={16} />,
  });
}

/**
 * Show a warning notification.
 */
export function showWarningNotification(
  message: React.ReactNode,
  title?: React.ReactNode
) {
  notifications.show({
    title,
    message,
    color: 'orange',
    icon: <IconAlertTriangle size={16} />,
  });
}
