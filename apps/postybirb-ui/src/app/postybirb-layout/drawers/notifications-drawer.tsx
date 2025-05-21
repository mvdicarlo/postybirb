/* eslint-disable no-console */
/* eslint-disable lingui/no-unlocalized-strings */
import { msg, Trans } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Drawer,
  Flex,
  Group,
  Input,
  Loader,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { INotification } from '@postybirb/types';
import {
  IconAlertTriangle,
  IconBell,
  IconBellOff,
  IconCheck,
  IconCircleCheck,
  IconExclamationCircle,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import moment from 'moment/min/moment-with-locales';
import { useMemo, useState } from 'react';
import notificationApi from '../../../api/notification.api';
import { NotificationStore } from '../../../stores/notification.store';
import { useStore } from '../../../stores/use-store';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

const getNotificationColor = (type: string): string => {
  switch (type) {
    case 'info':
      return 'blue';
    case 'success':
      return 'green';
    case 'warning':
      return 'yellow';
    case 'error':
      return 'red';
    default:
      return 'gray';
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <IconCircleCheck size={16} />;
    case 'error':
      return <IconExclamationCircle size={16} />;
    case 'warning':
      return <IconAlertTriangle size={16} />;
    case 'info':
    default:
      return <IconBell size={16} />;
  }
};

const getNotificationType = (type: string) => {
  switch (type) {
    case 'success':
      return <Trans>Success</Trans>;
    case 'error':
      return <Trans>Error</Trans>;
    case 'warning':
      return <Trans>Warning</Trans>;
    case 'info':
    default:
      return <Trans>Info</Trans>;
  }
};

function NotificationCard({ notification }: { notification: INotification }) {
  const toggleReadStatus = () => {
    notificationApi
      .update(notification.id, {
        ...notification,
        isRead: !notification.isRead,
      })
      .catch((error) => {
        console.error('Failed to update notification read status', error);
      });
  };

  const deleteNotification = () => {
    notificationApi.remove([notification.id]).catch((error) => {
      console.error('Failed to delete notification', error);
    });
  };

  const formattedDate = moment(notification.createdAt).fromNow();
  const color = getNotificationColor(notification.type);

  // Generate styles for card coloring
  const cardStyles = {
    root: {
      borderLeft: `4px solid var(--mantine-color-${color}-8)`,
    },
  };

  return (
    <Card shadow="sm" p="md" radius="md" withBorder styles={cardStyles}>
      <Flex justify="space-between" align="flex-start">
        <Box style={{ flex: 1 }}>
          <Group mb="xs">
            <Badge
              color={color}
              leftSection={getNotificationIcon(notification.type)}
            >
              {getNotificationType(notification.type)}
            </Badge>
            {!notification.isRead && (
              <Badge variant="dot" color="blue">
                <Trans>New</Trans>
              </Badge>
            )}
          </Group>
          <Text fw={500} mb="xs">
            {notification.title}
          </Text>
          <Text size="sm" lineClamp={3}>
            {notification.message}
          </Text>
          <Text
            size="xs"
            c="dimmed"
            mt="xs"
            title={new Date(notification.createdAt).toLocaleString()}
          >
            {formattedDate}
          </Text>
        </Box>
        <Group gap="xs">
          <Tooltip
            label={
              notification.isRead ? (
                <Trans>Mark as Unread</Trans>
              ) : (
                <Trans>Mark as Read</Trans>
              )
            }
            position="top"
            withArrow
          >
            <ActionIcon
              color={notification.isRead ? 'blue' : 'green'}
              variant="light"
              onClick={toggleReadStatus}
            >
              <IconCheck size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={<Trans>Delete</Trans>} position="top" withArrow>
            <ActionIcon
              color="red"
              variant="light"
              onClick={deleteNotification}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Flex>
    </Card>
  );
}

export function NotificationsDrawer() {
  const [visible, toggle] = useDrawerToggle('notificationsDrawerVisible');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { _ } = useLingui();
  const { state: notifications, isLoading } = useStore(NotificationStore);
  const [clearPopoverOpened, setClearPopoverOpened] = useState(false);

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter((notification) => !notification.isRead);
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(
        (notification) => notification.type === activeTab,
      );
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (notification) =>
          notification.title.toLowerCase().includes(query) ||
          notification.message.toLowerCase().includes(query),
      );
    }

    // Sort by date (most recent first)
    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifications, activeTab, searchQuery]);

  const notificationCount = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const info = notifications.filter((n) => n.type === 'info').length;
    const success = notifications.filter((n) => n.type === 'success').length;
    const warning = notifications.filter((n) => n.type === 'warning').length;
    const error = notifications.filter((n) => n.type === 'error').length;

    return {
      unread,
      info,
      success,
      warning,
      error,
      all: notifications.length,
    };
  }, [notifications]);

  const handleMarkAllAsRead = () => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length === 0) return;

    Promise.all(
      unreadNotifications.map((notification) =>
        notificationApi.update(notification.id, {
          ...notification,
          isRead: true,
        }),
      ),
    ).catch((error) => {
      console.error('Failed to mark all notifications as read', error);
    });
  };

  const handleClearAll = () => {
    const notificationIds = notifications.map((n) => n.id);
    if (notificationIds.length > 0) {
      notificationApi.remove(notificationIds).catch((error) => {
        console.error('Failed to clear notifications', error);
      });
    }
    setClearPopoverOpened(false);
  };

  const handleClearFiltered = () => {
    if (filteredNotifications.length === 0) return;

    const notificationIds = filteredNotifications.map((n) => n.id);
    if (notificationIds.length > 0) {
      notificationApi.remove(notificationIds).catch((error) => {
        console.error('Failed to clear notifications', error);
      });
    }
    setClearPopoverOpened(false);
  };

  return (
    <Drawer
      withOverlay={false}
      closeOnClickOutside
      ml={-marginOffset}
      size="xl"
      portalProps={{
        target: getPortalTarget(),
      }}
      overlayProps={{
        left: getOverlayOffset(),
        zIndex: 100,
      }}
      trapFocus
      opened={visible}
      onClose={() => toggle()}
      title={
        <Text fw="bold" size="1.2rem">
          <Trans>Notifications</Trans>
        </Text>
      }
      styles={{
        body: {
          padding: '16px',
          height: 'calc(100% - 60px)',
        },
      }}
    >
      <Stack gap="md" h="100%">
        <Input
          placeholder={_(msg`Search notifications...`)}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        <SegmentedControl
          value={activeTab}
          onChange={setActiveTab}
          fullWidth
          data={[
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>All</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.all}
                  </Badge>
                </Group>
              ),
              value: 'all',
            },
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>Unread</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.unread}
                  </Badge>
                </Group>
              ),
              value: 'unread',
            },
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>Info</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.info}
                  </Badge>
                </Group>
              ),
              value: 'info',
            },
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>Success</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.success}
                  </Badge>
                </Group>
              ),
              value: 'success',
            },
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>Warning</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.warning}
                  </Badge>
                </Group>
              ),
              value: 'warning',
            },
            {
              label: (
                <Group gap={4}>
                  <Text>
                    <Trans>Error</Trans>
                  </Text>
                  <Badge size="xs" variant="light">
                    {notificationCount.error}
                  </Badge>
                </Group>
              ),
              value: 'error',
            },
          ]}
        />

        <Group grow>
          <Button
            leftSection={<IconCheck size={16} />}
            onClick={handleMarkAllAsRead}
            disabled={notificationCount.unread === 0}
          >
            <Trans>Mark All as Read</Trans>
          </Button>

          <Popover
            position="bottom-end"
            withArrow
            trapFocus
            opened={clearPopoverOpened}
            onChange={setClearPopoverOpened}
            width={260}
          >
            <Popover.Target>
              <Button
                leftSection={<IconTrash size={16} />}
                color="red"
                variant="light"
                onClick={() => setClearPopoverOpened(true)}
                disabled={notifications.length === 0}
              >
                <Trans>Clear</Trans>
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack>
                <Text c="orange" size="sm">
                  <Trans>Select which notifications to delete:</Trans>
                </Text>

                <Button
                  size="compact-sm"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleClearFiltered}
                  disabled={filteredNotifications.length === 0}
                >
                  <Trans>Clear Filtered ({filteredNotifications.length})</Trans>
                </Button>

                <Button
                  size="compact-sm"
                  color="red"
                  leftSection={<IconTrash size={16} />}
                  onClick={handleClearAll}
                  disabled={notifications.length === 0}
                >
                  <Trans>Clear All ({notifications.length})</Trans>
                </Button>

                <Button
                  variant="default"
                  size="compact-sm"
                  onClick={() => setClearPopoverOpened(false)}
                >
                  <Trans>Cancel</Trans>
                </Button>
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>

        <ScrollArea h="calc(100% - 130px)" offsetScrollbars>
          {isLoading ? (
            <Center h="100%">
              <Loader />
            </Center>
          ) : filteredNotifications.length === 0 ? (
            <Center h="100%">
              <Stack align="center">
                <IconBellOff size={48} opacity={0.5} />
                <Text c="dimmed">
                  <Trans>No notifications found</Trans>
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="md">
              {filteredNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </Stack>
          )}
        </ScrollArea>
      </Stack>
    </Drawer>
  );
}
