/* eslint-disable lingui/no-unlocalized-strings */
import { MantineColor } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { INotification } from '@postybirb/types';
import notificationApi from '../api/notification.api';
import StoreManager from './store-manager';

export const NotificationStore: StoreManager<INotification> =
  new StoreManager<INotification>(
    NOTIFICATION_UPDATES,
    () => notificationApi.getAll().then(({ body }) => body),
    {
      onEachMessage: (notification) => {
        // Display UI notifications for notifications with hasEmitted: false
        if (notification.hasEmitted === false) {
          const id = `notification-${notification.id}`;
          let color: MantineColor = 'blue';
          if (notification.type === 'error') {
            color = 'red';
          } else if (notification.type === 'success') {
            color = 'green';
          } else if (notification.type === 'info') {
            color = 'blue';
          } else if (notification.type === 'warning') {
            color = 'yellow';
          }
          notifications.show({
            id,
            title: notification.title || 'Notification',
            message: notification.message,
            autoClose: true,
            color,
            onClose: () => {
              // Update the notification to set hasEmitted to true
              notificationApi
                .update(notification.id, { ...notification, hasEmitted: true })
                .then(() => {
                  // eslint-disable-next-line no-console
                  console.log(
                    `Notification ${notification.id} marked as emitted`,
                  );
                })
                .catch((error) => {
                  // eslint-disable-next-line no-console
                  console.error('Failed to update notification:', error);
                });
            },
          });
        }
      },
    },
  );
