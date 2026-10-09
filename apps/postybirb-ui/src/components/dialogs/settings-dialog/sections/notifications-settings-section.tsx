/**
 * Notifications Settings Section - Desktop notification preferences.
 */

import { Trans } from '@lingui/react/macro';
import { Box, Stack, Switch, Title } from '@mantine/core';
import type { DesktopNotificationSettings } from '@postybirb/types';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores';

export function NotificationsSettingsSection() {
  const settings = useSettings();

  if (!settings) return null;

  const updateDesktopNotifications = (
    key: keyof DesktopNotificationSettings,
    value: boolean,
  ) => {
    const updatedDesktopNotifications = {
      ...settings.desktopNotifications,
      [key]: value,
    };

    settingsApi.update(settings.id, {
      settings: {
        ...settings.settings,
        desktopNotifications: updatedDesktopNotifications,
      },
    });
  };

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Desktop Notifications</Trans>
        </Title>

        <Stack gap="md">
          <Switch
            label={<Trans>Enable desktop notifications</Trans>}
            checked={settings.desktopNotifications?.enabled ?? false}
            onChange={(event) => {
              updateDesktopNotifications('enabled', event.currentTarget.checked);
            }}
          />

          {settings.desktopNotifications?.enabled && (
            <Stack gap="sm" ml="md">
              <Switch
                label={<Trans>Post Success</Trans>}
                checked={settings.desktopNotifications?.showOnPostSuccess ?? false}
                onChange={(event) => {
                  updateDesktopNotifications(
                    'showOnPostSuccess',
                    event.currentTarget.checked,
                  );
                }}
              />
              <Switch
                label={<Trans>Post Failure</Trans>}
                checked={settings.desktopNotifications?.showOnPostError ?? true}
                onChange={(event) => {
                  updateDesktopNotifications(
                    'showOnPostError',
                    event.currentTarget.checked,
                  );
                }}
              />
              <Switch
                label={<Trans>File Watcher Success</Trans>}
                checked={
                  settings.desktopNotifications?.showOnDirectoryWatcherSuccess ??
                  false
                }
                onChange={(event) => {
                  updateDesktopNotifications(
                    'showOnDirectoryWatcherSuccess',
                    event.currentTarget.checked,
                  );
                }}
              />
              <Switch
                label={<Trans>File Watcher Failure</Trans>}
                checked={
                  settings.desktopNotifications?.showOnDirectoryWatcherError ??
                  true
                }
                onChange={(event) => {
                  updateDesktopNotifications(
                    'showOnDirectoryWatcherError',
                    event.currentTarget.checked,
                  );
                }}
              />
            </Stack>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
