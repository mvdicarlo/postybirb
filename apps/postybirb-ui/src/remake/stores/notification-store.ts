/**
 * Notification Store - Zustand store for notification entities.
 * Handles both data storage and UI notification display.
 */

import type { MantineColor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import type { INotification } from '@postybirb/types';
import { useShallow } from 'zustand/shallow';
import notificationApi from '../api/notification.api';
import AppSocket from '../transports/websocket';
import { createEntityStore, type EntityStore } from './create-entity-store';
import { NotificationRecord } from './records';

/**
 * Fetch all notifications from the API.
 */
const fetchNotifications = async (): Promise<INotification[]> => {
  const response = await notificationApi.getAll();
  return response.body;
};

/**
 * Get Mantine color based on notification type.
 */
function getNotificationColor(type: INotification['type']): MantineColor {
  switch (type) {
    case 'error':
      return 'red';
    case 'success':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'info':
    default:
      return 'blue';
  }
}

/**
 * Display a UI notification for notifications that haven't been emitted yet.
 * Marks the notification as emitted when closed.
 */
function showUINotification(notification: INotification): void {
  if (notification.hasEmitted !== false) {
    return;
  }

  // eslint-disable-next-line lingui/no-unlocalized-strings
  const id = `notification-${notification.id}`;
  const color = getNotificationColor(notification.type);

  notifications.show({
    id,
    // eslint-disable-next-line lingui/no-unlocalized-strings
    title: notification.title || 'Notification',
    message: notification.message,
    autoClose: true,
    color,
    onClose: () => {
      // Mark the notification as emitted when closed
      notificationApi
        .update(notification.id, { ...notification, hasEmitted: true })
        .then(() => {
          // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
          console.debug(`Notification ${notification.id} marked as emitted`);
        })
        .catch((error) => {
          // eslint-disable-next-line no-console, lingui/no-unlocalized-strings
          console.error('Failed to update notification:', error);
        });
    },
  });
}

/**
 * Subscribe to websocket updates and show UI notifications for new ones.
 */
AppSocket.on(NOTIFICATION_UPDATES, (data: INotification[]) => {
  data.forEach(showUINotification);
});

/**
 * Notification store instance.
 */
export const useNotificationStore = createEntityStore<
  INotification,
  NotificationRecord
>(fetchNotifications, (dto) => new NotificationRecord(dto), {
  // eslint-disable-next-line lingui/no-unlocalized-strings
  storeName: 'NotificationStore',
  websocketEvent: NOTIFICATION_UPDATES,
});

/**
 * Type alias for the notification store.
 */
export type NotificationStore = EntityStore<NotificationRecord>;

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select all notifications.
 */
export const useNotifications = (): NotificationRecord[] =>
  useNotificationStore((state: NotificationStore) => state.records);

/**
 * Select notifications map for O(1) lookup.
 */
export const useNotificationsMap = (): Map<string, NotificationRecord> =>
  useNotificationStore((state: NotificationStore) => state.recordsMap);

/**
 * Select notification loading state.
 */
export const useNotificationsLoading = () =>
  useNotificationStore(
    useShallow((state: NotificationStore) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select unread notifications.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useUnreadNotifications = (): NotificationRecord[] =>
  useNotificationStore(
    useShallow((state: NotificationStore) => state.records.filter((n) => n.isUnread))
  );

/**
 * Select unread notification count.
 */
export const useUnreadNotificationCount = (): number =>
  useNotificationStore((state: NotificationStore) => state.records.filter((n) => n.isUnread).length);

/**
 * Select error notifications.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useErrorNotifications = (): NotificationRecord[] =>
  useNotificationStore(
    useShallow((state: NotificationStore) => state.records.filter((n) => n.isError))
  );

/**
 * Select warning notifications.
 * Uses useShallow for stable reference when items haven't changed.
 */
export const useWarningNotifications = (): NotificationRecord[] =>
  useNotificationStore(
    useShallow((state: NotificationStore) => state.records.filter((n) => n.isWarning))
  );

/**
 * Select notification store actions.
 */
export const useNotificationActions = () =>
  useNotificationStore(
    useShallow((state: NotificationStore) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
