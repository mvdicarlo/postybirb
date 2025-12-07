/**
 * Notification Store - Zustand store for notification entities.
 */

import type { INotification } from '@postybirb/types';
import { useShallow } from 'zustand/react/shallow';
import notificationApi from '../api/notification.api';
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
 * Notification store instance.
 */
export const useNotificationStore = createEntityStore<INotification, NotificationRecord>(
  fetchNotifications,
  (dto) => new NotificationRecord(dto),
  // eslint-disable-next-line lingui/no-unlocalized-strings
  'NotificationStore'
);

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
export const useNotifications = () => useNotificationStore((state) => state.records);

/**
 * Select notifications map for O(1) lookup.
 */
export const useNotificationsMap = () => useNotificationStore((state) => state.recordsMap);

/**
 * Select notification loading state.
 */
export const useNotificationsLoading = () =>
  useNotificationStore(
    useShallow((state) => ({
      loadingState: state.loadingState,
      error: state.error,
      isLoading: state.loadingState === 'loading',
      isLoaded: state.loadingState === 'loaded',
    }))
  );

/**
 * Select unread notifications.
 */
export const useUnreadNotifications = () =>
  useNotificationStore((state) => state.records.filter((n) => n.isUnread));

/**
 * Select unread notification count.
 */
export const useUnreadNotificationCount = () =>
  useNotificationStore((state) => state.records.filter((n) => n.isUnread).length);

/**
 * Select error notifications.
 */
export const useErrorNotifications = () =>
  useNotificationStore((state) => state.records.filter((n) => n.isError));

/**
 * Select warning notifications.
 */
export const useWarningNotifications = () =>
  useNotificationStore((state) => state.records.filter((n) => n.isWarning));

/**
 * Select notification store actions.
 */
export const useNotificationActions = () =>
  useNotificationStore(
    useShallow((state) => ({
      loadAll: state.loadAll,
      setRecords: state.setRecords,
      getById: state.getById,
      clear: state.clear,
    }))
  );
