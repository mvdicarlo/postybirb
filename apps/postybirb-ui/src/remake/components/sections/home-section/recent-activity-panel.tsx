/**
 * RecentActivityPanel - Panel showing recent notifications/activity.
 * Displays the last 5 notifications with type-based icons.
 */

import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import {
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import type { NotificationRecord } from '../../../stores/records';
import { useNotifications } from '../../../stores/notification-store';
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
  const { _ } = useLingui();

  return (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return _(msg`just now`);
    }
    if (diffMins < 60) {
      return _(msg`${diffMins}m ago`);
    }
    if (diffHours < 24) {
      return _(msg`${diffHours}h ago`);
    }
    if (diffDays === 1) {
      return _(msg`yesterday`);
    }
    if (diffDays < 7) {
      return _(msg`${diffDays}d ago`);
    }
    return date.toLocaleDateString();
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
    [notifications]
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
              description={<Trans>Activity will appear here as you use the app</Trans>}
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
                  <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                      <ThemeIcon size="sm" variant="light" color={color} radius="xl">
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
