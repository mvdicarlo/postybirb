/**
 * Notifications drawer tour step definitions.
 * Walks the user through the notifications management drawer.
 */

import { Trans } from '@lingui/react/macro';
import { Text } from '@mantine/core';
import type { Step } from 'react-joyride';

export const NOTIFICATIONS_TOUR_ID = 'notifications';

/**
 * Returns the notifications tour steps with translated content.
 */
export function useNotificationsTourSteps(): Step[] {
  return [
    {
      target: 'body',
      placement: 'center',
      skipBeacon: true,
      title: <Trans>Notifications Overview</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Notifications keep you informed about posting results, errors, and
            other important events. Review them here to stay on top of your
            activity.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="notifications-read-filter"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Read Status Filter</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter notifications by their read status. Quickly find unread
            notifications that need your attention.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="notifications-type-filter"]',
      placement: 'bottom',
      skipBeacon: true,
      title: <Trans>Type Filter</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Filter by notification type — errors, warnings, successes, or info
            messages. Helps you focus on what matters most.
          </Trans>
        </Text>
      ),
    },
    {
      target: '[data-tour-id="notifications-list"]',
      placement: 'right',
      skipBeacon: true,
      title: <Trans>Notification List</Trans>,
      content: (
        <Text size="sm" c="dimmed">
          <Trans>
            Each notification shows its type, message, and time. Select
            notifications with checkboxes to mark them as read or delete them in
            bulk.
          </Trans>
        </Text>
      ),
    },
  ];
}
