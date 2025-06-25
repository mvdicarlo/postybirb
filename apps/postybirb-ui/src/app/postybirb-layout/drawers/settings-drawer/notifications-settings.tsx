import { Trans } from '@lingui/macro';
import {
    Card,
    Group,
    Stack,
    Switch,
    Text,
} from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores/use-settings';

export function NotificationsSettings() {
  const { settingsId, settings } = useSettings();

  const updateDesktopNotifications = (key: string, value: boolean) => {
    const updatedDesktopNotifications = {
      ...settings?.desktopNotifications,
      [key]: value,
    };

    settingsApi.update(settingsId, {
      settings: {
        ...settings,
        desktopNotifications: updatedDesktopNotifications,
      },
    });
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconBell size={20} />
          <Text fw={500} size="lg">
            <Trans>Desktop Notifications</Trans>
          </Text>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Switch
          label={<Trans>Enable desktop notifications</Trans>}
          checked={settings?.desktopNotifications?.enabled ?? false}
          onChange={(event) => {
            updateDesktopNotifications('enabled', event.currentTarget.checked);
          }}
        />

        {settings?.desktopNotifications?.enabled && (
          <>
            <Switch
              ml="md"
              label={<Trans>Show notification on post success</Trans>}
              checked={
                settings?.desktopNotifications?.showOnPostSuccess ?? false
              }
              onChange={(event) => {
                updateDesktopNotifications(
                  'showOnPostSuccess',
                  event.currentTarget.checked,
                );
              }}
            />
            <Switch
              ml="md"
              label={<Trans>Show notification on post error</Trans>}
              checked={settings?.desktopNotifications?.showOnPostError ?? true}
              onChange={(event) => {
                updateDesktopNotifications(
                  'showOnPostError',
                  event.currentTarget.checked,
                );
              }}
            />
            <Switch
              ml="md"
              label={<Trans>Show notification on file watcher success</Trans>}
              checked={
                settings?.desktopNotifications?.showOnDirectoryWatcherSuccess ??
                false
              }
              onChange={(event) => {
                updateDesktopNotifications(
                  'showOnFileWatcherSuccess',
                  event.currentTarget.checked,
                );
              }}
            />
            <Switch
              ml="md"
              label={<Trans>Show notification on file watcher error</Trans>}
              checked={
                settings?.desktopNotifications?.showOnDirectoryWatcherError ??
                true
              }
              onChange={(event) => {
                updateDesktopNotifications(
                  'showOnFileWatcherError',
                  event.currentTarget.checked,
                );
              }}
            />
          </>
        )}
      </Stack>
    </Card>
  );
}
