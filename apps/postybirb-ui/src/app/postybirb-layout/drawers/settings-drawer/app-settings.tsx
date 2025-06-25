import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
    Box,
    Button,
    Card,
    Group,
    Stack,
    Switch,
    Text,
    TextInput,
} from '@mantine/core';
import {
    IconDeviceDesktop,
    IconFolder,
    IconRouter,
} from '@tabler/icons-react';
import { useQuery } from 'react-query';
import settingsApi from '../../../../api/settings.api';

export function AppSettings() {
  const { _ } = useLingui();
  const {
    data: startupSettings,
    isLoading,
    refetch,
  } = useQuery(
    'startup',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    {
      cacheTime: 0,
    },
  );

  if (isLoading) return null;

  return (
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
              .updateSystemStartupSettings({
                port: newPort.toString(),
              })
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
              placeholder={_(msg`Click to select folder`)}
              readOnly
            />
            <Button
              onClick={() => {
                if (window?.electron?.pickDirectory) {
                  window.electron.pickDirectory().then((appDataPath) => {
                    if (appDataPath) {
                      settingsApi
                        .updateSystemStartupSettings({
                          appDataPath,
                        })
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
  );
}
