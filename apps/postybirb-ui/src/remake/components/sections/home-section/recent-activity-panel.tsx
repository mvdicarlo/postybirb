/**
 * RecentActivityPanel - Panel showing recent notifications/activity.
 * Displays the last 5 notifications with type-based icons.
 */

import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { Box, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useMemo } from 'react';
import { useNotifications } from '../../../stores/notification-store';
import type { NotificationRecord } from '../../../stores/records';
import { EmptyState } from '../../empty-state';

/**
 * Get icon and color for notification type.
 */
function getNotificationIcon(type: NotificationRecord['type']): {
  icon: React.ReactNode;
  color: string;
} {
  switch (type) {
    case 'success':
      return { icon: <IconCheck size={14} />, color: 'green' };
    case 'error':
      return { icon: <IconX size={14} />, color: 'red' };
    case 'warning':
      return { icon: <IconAlertTriangle size={14} />, color: 'yellow' };
    case 'info':
    default:
      return { icon: <IconInfoCircle size={14} />, color: 'blue' };
  }
}

/**
 * Hook to format relative time for notifications.
 */
function useFormatTimeAgo() {
  const { i18n } = useLingui();

  return (date: Date): string => {
    moment.locale(i18n.locale);
    return moment(date).fromNow();
  };
}

/**
 * RecentActivityPanel component.
 * Shows the last 5 notifications sorted by creation date.
 */
export function RecentActivityPanel() {
  const notifications = useNotifications();
  const formatTimeAgo = useFormatTimeAgo();

  const recentActivity = useMemo(
    () =>
      [...notifications]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5),
    [notifications],
  );

  return (
    <Paper withBorder p="md" radius="md" h="100%">
      <Stack gap="sm" h="100%">
        <Group gap="xs">
          <ThemeIcon size="md" variant="light" color="cyan" radius="md">
            <IconActivity size={16} />
          </ThemeIcon>
          <Text size="sm" fw={500}>
            <Trans>Recent Activity</Trans>
          </Text>
        </Group>

        {recentActivity.length === 0 ? (
          <Box style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <EmptyState
              preset="no-notifications"
              message={<Trans>No recent activity</Trans>}
              description={
                <Trans>Activity will appear here as you use the app</Trans>
              }
              size="sm"
            />
          </Box>
        ) : (
          <Stack gap="xs">
            {recentActivity.map((notification) => {
              const { icon, color } = getNotificationIcon(notification.type);
              return (
                <Paper
                  key={notification.id}
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-default)"
                >
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      style={{ minWidth: 0, flex: 1 }}
                    >
                      <ThemeIcon
                        size="sm"
                        variant="light"
                        color={color}
                        radius="xl"
                      >
                        {icon}
                      </ThemeIcon>
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" truncate fw={500}>
                          {notification.title}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {notification.message}
                        </Text>
                      </Box>
                    </Group>
                    <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                      {formatTimeAgo(notification.createdAt)}
                    </Text>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
