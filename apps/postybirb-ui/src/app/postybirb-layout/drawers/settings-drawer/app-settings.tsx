import { Trans, useLingui } from '@lingui/react/macro';
import {
  Box,
  Button,
  Card,
  Group,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconDeviceDesktop,
  IconFolder,
  IconRefresh,
  IconRouter,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';
import { getUIMode, setUIMode, type UIMode } from '../../../../shared/ui-mode';

export function AppSettings() {
  const { t } = useLingui();
  const [currentUIMode, setCurrentUIMode] = useState<UIMode>(getUIMode);
  const [pendingUIMode, setPendingUIMode] = useState<UIMode | null>(null);

  const {
    data: startupSettings,
    isLoading,
    refetch,
  } = useQuery(
    'startup',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    { cacheTime: 0 },
  );

  const handleUIModeChange = (value: string) => {
    const newMode = value as UIMode;
    if (newMode !== currentUIMode) {
      setPendingUIMode(newMode);
    }
  };

  const confirmUIModeChange = () => {
    if (pendingUIMode) {
      setUIMode(pendingUIMode);
      window.location.reload();
    }
  };

  const cancelUIModeChange = () => {
    setPendingUIMode(null);
  };

  if (isLoading) return null;

  return (
    <Stack gap="md">
      {/* UI Mode Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <IconDeviceDesktop size={20} />
            <Text fw={500} size="lg">
              <Trans>UI Mode</Trans>
            </Text>
          </Group>
        </Card.Section>

        <Stack mt="md" gap="md">
          <Box>
            <Text size="sm" c="dimmed" mb="xs">
              <Trans>
                Choose which UI experience to use. Changing this will reload the
                page.
              </Trans>
            </Text>
            <SegmentedControl
              value={currentUIMode}
              onChange={handleUIModeChange}
              data={[
                { value: 'remake', label: t`A` },
                { value: 'legacy', label: t`B` },
              ]}
              fullWidth
            />
          </Box>

          {pendingUIMode && (
            <Box
              p="md"
              style={(theme) => ({
                borderRadius: theme.radius.sm,
              })}
            >
              <Text size="sm" mb="sm">
                <Trans>
                  Changing UI mode requires a page reload. Any unsaved changes
                  will be lost. Continue?
                </Trans>
              </Text>
              <Group gap="sm">
                <Button
                  size="xs"
                  leftSection={<IconRefresh size={14} />}
                  onClick={confirmUIModeChange}
                >
                  <Trans>Reload Now</Trans>
                </Button>
                <Button size="xs" variant="subtle" onClick={cancelUIModeChange}>
                  <Trans>Cancel</Trans>
                </Button>
              </Group>
            </Box>
          )}
        </Stack>
      </Card>

      {/* Startup Settings Card */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Card.Section withBorder inheritPadding py="xs">
          <Group>
            <IconDeviceDesktop size={20} />
            <Text fw={500} size="lg">
              <Trans>Startup Settings</Trans>
            </Text>
          </Group>
        </Card.Section>

        <Stack mt="md" gap="md">
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
                          .finally(() => {
                            refetch();
                          });
                      }
                    });
                  }
                }}
              >
                <Trans>Browse</Trans>
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt={5}>
              <Trans>
                This is the folder where the app will store its data. You must
                restart the app for this to take effect.
              </Trans>
            </Text>
          </Box>
        </Stack>
      </Card>
    </Stack>
  );
}
