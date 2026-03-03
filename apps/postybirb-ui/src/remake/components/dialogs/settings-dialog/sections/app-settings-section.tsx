/**
 * App Settings Section - Startup and system settings.
 */

import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Button,
  Group,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  useMantineColorScheme
} from '@mantine/core';
import { IconFolder, IconRouter } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';

export function AppSettingsSection() {
  const { t } = useLingui();
  const { colorScheme } = useMantineColorScheme();

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

  if (isLoading) return null;

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
                    window.electron.pickDirectory().then((appDataPath) => {
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
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
