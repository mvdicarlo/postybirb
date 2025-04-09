/* eslint-disable lingui/no-unlocalized-strings */
import { notifications } from '@mantine/notifications';
import { NOTIFICATION_UPDATES } from '@postybirb/socket-events';
import { INotification } from '@postybirb/types';
import notificationApi from '../api/notification.api';
import StoreManager from './store-manager';

export const NotificationStore: StoreManager<INotification> =
  new StoreManager<INotification>(NOTIFICATION_UPDATES, () =>
    notificationApi
      .getAll()
      .then(({ body }) => body)
      .then((data) => {
        // Display UI notifications for items with hasEmitted: false
        data
          .filter((item) => item.hasEmitted === false)
          .forEach((item) => {
            const id = `notification-${item.id}`;

            notifications.show({
              id,
              title: item.title || 'Notification',
              message: item.message,
              autoClose: true,
              onClose: () => {
                // Update the notification to set hasEmitted to true
                notificationApi
                  .update(item.id, { ...item, hasEmitted: true })
                  .then(() => {
                    // eslint-disable-next-line no-console
                    console.log(`Notification ${item.id} marked as emitted`);
                  })
                  .catch((error) => {
                    // eslint-disable-next-line no-console
                    console.error('Failed to update notification:', error);
                  });
              },
            });
          });

        return data;
      }),
  );
