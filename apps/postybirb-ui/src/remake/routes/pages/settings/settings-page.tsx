import { Trans } from '@lingui/macro';
import { Divider, Group, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { useState } from 'react';

/**
 * Settings page demo component.
 * Displays placeholder settings content.
 */
export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  return (
    <Stack gap="md">
      <Title order={2}>
        <Trans>Settings</Trans>
      </Title>

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          <Trans>General</Trans>
        </Title>
        <Stack gap="sm">
          <Group justify="space-between">
            <div>
              <Text fw={500}>
                <Trans>Notifications</Trans>
              </Text>
              <Text size="sm" c="dimmed">
                <Trans>Receive notifications for submission updates</Trans>
              </Text>
            </div>
            <Switch
              checked={notifications}
              onChange={(e) => setNotifications(e.currentTarget.checked)}
            />
          </Group>

          <Divider />

          <Group justify="space-between">
            <div>
              <Text fw={500}>
                <Trans>Dark Mode</Trans>
              </Text>
              <Text size="sm" c="dimmed">
                <Trans>Use dark theme for the interface</Trans>
              </Text>
            </div>
            <Switch
              checked={darkMode}
              onChange={(e) => setDarkMode(e.currentTarget.checked)}
            />
          </Group>

          <Divider />

          <Group justify="space-between">
            <div>
              <Text fw={500}>
                <Trans>Auto-Save</Trans>
              </Text>
              <Text size="sm" c="dimmed">
                <Trans>Automatically save drafts while editing</Trans>
              </Text>
            </div>
            <Switch
              checked={autoSave}
              onChange={(e) => setAutoSave(e.currentTarget.checked)}
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        <Title order={4} mb="md">
          <Trans>About</Trans>
        </Title>
        <Text c="dimmed">
          <Trans>PostyBirb Remake UI - Layout Foundation Demo</Trans>
        </Text>
      </Paper>
    </Stack>
  );
}
