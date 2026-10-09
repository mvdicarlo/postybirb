/**
 * App Settings Section - Startup and system settings.
 */

import { Trans } from '@lingui/react/macro';
import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconFolder, IconRouter } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';
import { useSettings } from '../../../../stores';

export function AppSettingsSection() {
  const settings = useSettings();
  const {
    data: startupSettings,
    isLoading,
    refetch,
  } = useQuery(
    // eslint-disable-next-line lingui/no-unlocalized-strings
    'startup-settings',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    { cacheTime: 0 },
  );

  if (isLoading) return <Loader />;

  return (
    <Stack gap="lg">
      <Box>
        <Title order={4} mb="md">
          <Trans>Startup Settings</Trans>
        </Title>

        <Stack gap="md">
          <Switch
            label={<Trans>Open PostyBirb on computer startup</Trans>}
            checked={startupSettings?.startAppOnSystemStartup ?? false}
            onChange={(event) => {
              settingsApi
                .updateSystemStartupSettings({
                  startAppOnSystemStartup: event.currentTarget.checked,
                })
                .finally(refetch);
            }}
          />

          <TextInput
            label={<Trans>App Server Port</Trans>}
            leftSection={<IconRouter size={18} />}
            value={startupSettings?.port ?? '9487'}
            type="number"
            min={1025}
            max={65535}
            onChange={(event) => {
              const newPortStr = event.currentTarget.value;
              const newPort = parseInt(newPortStr, 10);

              if (Number.isNaN(newPort) || newPort < 1025 || newPort > 65535) {
                return;
              }

              settingsApi
                .updateSystemStartupSettings({ port: newPort.toString() })
                .finally(refetch);
            }}
          />

          <Box>
            <Text size="sm" fw={500} mb="xs">
              <Trans>App Folder</Trans>
            </Text>
            <Group align="flex-end" gap="xs">
              <TextInput
                style={{ flex: 1 }}
                leftSection={<IconFolder size={18} />}
                value={startupSettings?.appDataPath ?? ''}
                readOnly
              />
              <Button
                onClick={() => {
                  if (window?.electron?.pickDirectory) {
                    window.electron
                      .pickDirectory(startupSettings?.appDataPath)
                      .then((appDataPath) => {
                        if (appDataPath) {
                          settingsApi
                            .updateSystemStartupSettings({ appDataPath })
                            .finally(refetch);
                        }
                      });
                  }
                }}
              >
                <Trans>Browse</Trans>
              </Button>
            </Group>
            <Alert color="yellow" mt="xs">
              <Stack gap="xs">
                <Trans>
                  Changing storage folder does not automatically move app data.
                  You need to change location, quit using button below and then
                  manually move files.
                </Trans>
              </Stack>
            </Alert>
          </Box>

          <Alert color="yellow">
            <Stack gap="xs">
              <Trans>
                If you change these settings you will need to restart the app
                using the Quit button to apply them.
              </Trans>
              <Button color="yellow" onClick={() => window.electron.quit()}>
                <Trans>Quit</Trans>
              </Button>
            </Stack>
          </Alert>
        </Stack>
      </Box>

      {settings && (
        <Box>
          <Title order={4} mb="md">
            <Trans>Cloudflare Challenges</Trans>
          </Title>

          <Stack gap="xs">
            <Switch
              label={
                <Trans>
                  Open a browser window when Cloudflare requires attention
                </Trans>
              }
              checked={
                settings.settings.cloudflareChallenge?.openBrowserWindow ??
                false
              }
              onChange={(event) => {
                settingsApi.update(settings.id, {
                  settings: {
                    ...settings.settings,
                    cloudflareChallenge: {
                      openBrowserWindow: event.currentTarget.checked,
                    },
                  },
                });
              }}
            />
            <Text size="xs" c="dimmed">
              <Trans>
                When a request is challenged, PostyBirb will open an account-specific
                browser window for you to complete the challenge manually. The post
                waits for up to five minutes and uses the resulting session cookies.
              </Trans>
            </Text>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
