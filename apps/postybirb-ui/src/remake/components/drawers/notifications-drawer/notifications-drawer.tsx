/**
 * NotificationsDrawer - Drawer for viewing and managing notifications.
 * Features filtering by read/unread status and severity type,
 * with actions for marking as read and deleting notifications.
 */

import { Trans } from '@lingui/react/macro';
import {
    ActionIcon,
    Badge,
    Box,
    Card,
    Checkbox,
    Group,
    SegmentedControl,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconBell,
    IconCheck,
    IconCircleCheck,
    IconExclamationCircle,
    IconMail,
    IconMailOpened,
    IconTrash,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';
import notificationApi from '../../../api/notification.api';
import { useLocale } from '../../../hooks';
import {
    useNotifications,
    useUnreadNotificationCount,
} from '../../../stores/notification-store';
import type { NotificationRecord } from '../../../stores/records';
import { useActiveDrawer, useDrawerActions } from '../../../stores/ui-store';
import {
    showDeletedNotification,
    showDeleteErrorNotification,
    showSuccessNotification,
    showUpdateErrorNotification,
} from '../../../utils/notifications';
import { EmptyState } from '../../empty-state';
import { HoldToConfirmButton } from '../../hold-to-confirm';
import { SectionDrawer } from '../section-drawer';

// ============================================================================
// Types & Constants
// ============================================================================

type ReadFilterValue = 'all' | 'unread' | 'read';
type TypeFilterValue = 'all' | 'error' | 'warning' | 'success' | 'info';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get Mantine color for notification type.
 */
function getTypeColor(type: NotificationRecord['type']): string {
  switch (type) {
    case 'error':
      return 'red';
    case 'warning':
      return 'yellow';
    case 'success':
      return 'green';
    case 'info':
    default:
      return 'blue';
  }
}

/**
 * Get icon for notification type.
 */
function getTypeIcon(type: NotificationRecord['type']): React.ReactNode {
  const size = 16;
  switch (type) {
    case 'error':
      return <IconExclamationCircle size={size} />;
    case 'warning':
      return <IconAlertTriangle size={size} />;
    case 'success':
      return <IconCircleCheck size={size} />;
    case 'info':
    default:
      return <IconBell size={size} />;
  }
}

// ============================================================================
// Filter Hook
// ============================================================================

/**
 * Hook to manage notification filtering.
 */
function useNotificationFilters() {
  const allNotifications = useNotifications();
  const [readFilter, setReadFilter] = useState<ReadFilterValue>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');

  const filteredNotifications = useMemo(() => {
    let notifications = [...allNotifications];

    // Filter by read status
    if (readFilter === 'unread') {
      notifications = notifications.filter((n) => n.isUnread);
    } else if (readFilter === 'read') {
      notifications = notifications.filter((n) => n.isRead);
    }

    // Filter by type
    if (typeFilter !== 'all') {
      notifications = notifications.filter((n) => n.type === typeFilter);
    }

    // Sort by newest first
    notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return notifications;
  }, [allNotifications, readFilter, typeFilter]);

  return {
    notifications: filteredNotifications,
    allNotifications,
    readFilter,
    setReadFilter,
    typeFilter,
    setTypeFilter,
  };
}

// ============================================================================
// Filter Components
// ============================================================================

/**
 * Read status filter segmented control.
 */
function ReadStatusFilter({
  value,
  onChange,
  unreadCount,
}: {
  value: ReadFilterValue;
  onChange: (value: ReadFilterValue) => void;
  unreadCount: number;
}) {
  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={(v) => onChange(v as ReadFilterValue)}
      data={[
        { value: 'all', label: <Trans>All</Trans> },
        {
          value: 'unread',
          label: (
            <Group gap={4} wrap="nowrap" justify="center">
              <span>
                <Trans>Unread</Trans>
              </span>
              {unreadCount > 0 && (
                <Badge size="xs" variant="filled" color="red">
                  {unreadCount}
                </Badge>
              )}
            </Group>
          ),
        },
        { value: 'read', label: <Trans>Read</Trans> },
      ]}
    />
  );
}

/**
 * Type filter segmented control.
 */
function TypeFilter({
  value,
  onChange,
}: {
  value: TypeFilterValue;
  onChange: (value: TypeFilterValue) => void;
}) {
  return (
    <SegmentedControl
      size="xs"
      value={value}
      onChange={(v) => onChange(v as TypeFilterValue)}
      data={[
        { value: 'all', label: <Trans>All</Trans> },
        {
          value: 'error',
          label: (
            <Tooltip label={<Trans>Errors</Trans>}>
              <Box c="red">
                <IconExclamationCircle size={14} />
              </Box>
            </Tooltip>
          ),
        },
        {
          value: 'warning',
          label: (
            <Tooltip label={<Trans>Warnings</Trans>}>
              <Box c="yellow">
                <IconAlertTriangle size={14} />
              </Box>
            </Tooltip>
          ),
        },
        {
          value: 'success',
          label: (
            <Tooltip label={<Trans>Success</Trans>}>
              <Box c="green">
                <IconCircleCheck size={14} />
              </Box>
            </Tooltip>
          ),
        },
        {
          value: 'info',
          label: (
            <Tooltip label={<Trans>Info</Trans>}>
              <Box c="blue">
                <IconBell size={14} />
              </Box>
            </Tooltip>
          ),
        },
      ]}
    />
  );
}

// ============================================================================
// Action Components
// ============================================================================

/**
 * Bulk actions for notifications.
 */
function BulkActions({
  selectedIds,
  notifications,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  notifications: NotificationRecord[];
  onClearSelection: () => void;
}) {
  const selectedNotifications = notifications.filter((n) =>
    selectedIds.has(n.id)
  );
  const count = selectedIds.size;
  const hasUnread = selectedNotifications.some((n) => n.isUnread);

  const handleMarkAsRead = useCallback(async () => {
    try {
      await Promise.all(
        selectedNotifications
          .filter((n) => n.isUnread)
          .map((n) =>
            notificationApi.update(n.id, { isRead: true, hasEmitted: true })
          )
      );
      showSuccessNotification(<Trans>Marked as read</Trans>);
      onClearSelection();
    } catch {
      showUpdateErrorNotification();
    }
  }, [selectedNotifications, onClearSelection]);

  const handleDelete = useCallback(async () => {
    try {
      await notificationApi.remove([...selectedIds]);
      showDeletedNotification(count);
      onClearSelection();
    } catch {
      showDeleteErrorNotification();
    }
  }, [selectedIds, count, onClearSelection]);

  if (count === 0) return null;

  return (
    <Group gap="xs">
      <Text size="sm" c="dimmed">
        <Trans>{count} selected</Trans>
      </Text>
      {hasUnread && (
        <Tooltip label={<Trans>Mark as read</Trans>}>
          <ActionIcon variant="subtle" color="blue" onClick={handleMarkAsRead}>
            <IconCheck size={16} />
          </ActionIcon>
        </Tooltip>
      )}
      <Tooltip label={<Trans>Hold to delete</Trans>}>
        <HoldToConfirmButton
          variant="subtle"
          color="red"
          onConfirm={handleDelete}
        >
          <IconTrash size={16} />
        </HoldToConfirmButton>
      </Tooltip>
    </Group>
  );
}

// ============================================================================
// Notification Card Component
// ============================================================================

/**
 * Individual notification card.
 */
function NotificationCard({
  notification,
  isSelected,
  onSelect,
}: {
  notification: NotificationRecord;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
}) {
  const color = getTypeColor(notification.type);
  const icon = getTypeIcon(notification.type);
  const { formatRelativeTime } = useLocale();

  const handleToggleRead = useCallback(async () => {
    try {
      await notificationApi.update(notification.id, {
        isRead: !notification.isRead,
        hasEmitted: true,
      });
    } catch {
      showUpdateErrorNotification();
    }
  }, [notification]);

  const handleDelete = useCallback(async () => {
    try {
      await notificationApi.remove([notification.id]);
    } catch {
      showDeleteErrorNotification();
    }
  }, [notification.id]);

  return (
    <Card
      padding="sm"
      withBorder
      style={{
        borderLeftWidth: 3,
        borderLeftColor: `var(--mantine-color-${color}-6)`,
        opacity: notification.isRead ? 0.7 : 1,
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Checkbox
          checked={isSelected}
          onChange={(e) => onSelect(notification.id, e.currentTarget.checked)}
          // eslint-disable-next-line lingui/no-unlocalized-strings
          aria-label="Select notification"
        />
        <Box c={color}>{icon}</Box>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Text size="sm" fw={notification.isUnread ? 600 : 400} truncate>
              {notification.title}
            </Text>
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {formatRelativeTime(notification.createdAt)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed" lineClamp={2}>
            {notification.message}
          </Text>
          {notification.tags.length > 0 && (
            <Group gap={4}>
              {notification.tags.map((tag) => (
                <Badge key={tag} size="xs" variant="light">
                  {tag}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
        <Group gap={4}>
          <Tooltip
            label={
              notification.isRead ? (
                <Trans>Mark as unread</Trans>
              ) : (
                <Trans>Mark as read</Trans>
              )
            }
          >
            <ActionIcon variant="subtle" size="sm" onClick={handleToggleRead}>
              {notification.isRead ? (
                <IconMail size={14} />
              ) : (
                <IconMailOpened size={14} />
              )}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={<Trans>Hold to delete</Trans>}>
            <HoldToConfirmButton
              variant="subtle"
              color="red"
              size="sm"
              onConfirm={handleDelete}
            >
              <IconTrash size={14} />
            </HoldToConfirmButton>
          </Tooltip>
        </Group>
      </Group>
    </Card>
  );
}

// ============================================================================
// Notification List Component
// ============================================================================

/**
 * List of notification cards.
 */
function NotificationList({
  notifications,
  selectedIds,
  onSelect,
  onSelectAll,
}: {
  notifications: NotificationRecord[];
  selectedIds: Set<string>;
  onSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}) {
  const allSelected =
    notifications.length > 0 && selectedIds.size === notifications.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  if (notifications.length === 0) {
    return <EmptyState preset="no-notifications" />;
  }

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={(e) => onSelectAll(e.currentTarget.checked)}
          label={<Trans>Select all</Trans>}
          size="xs"
        />
      </Group>
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          isSelected={selectedIds.has(notification.id)}
          onSelect={onSelect}
        />
      ))}
    </Stack>
  );
}

// ============================================================================
// Main Drawer Component
// ============================================================================

/**
 * Notifications drawer component.
 */
export function NotificationsDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === 'notifications';
  const unreadCount = useUnreadNotificationCount();

  const {
    notifications,
    readFilter,
    setReadFilter,
    typeFilter,
    setTypeFilter,
  } = useNotificationFilters();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(notifications.map((n) => n.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [notifications]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={
        <Group gap="xs">
          <Trans>Notifications</Trans>
          {unreadCount > 0 && (
            <Badge size="sm" variant="filled" color="red">
              {unreadCount}
            </Badge>
          )}
        </Group>
      }
      width={500}
    >
      <Stack gap="md" h="100%">
        {/* Filters */}
        <Stack gap="xs">
          <ReadStatusFilter
            value={readFilter}
            onChange={setReadFilter}
            unreadCount={unreadCount}
          />
          <TypeFilter value={typeFilter} onChange={setTypeFilter} />
        </Stack>

        {/* Bulk Actions */}
        <BulkActions
          selectedIds={selectedIds}
          notifications={notifications}
          onClearSelection={handleClearSelection}
        />

        {/* Notification List */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <NotificationList
            notifications={notifications}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectAll={handleSelectAll}
          />
        </Box>
      </Stack>
    </SectionDrawer>
  );
}
