import { Trans } from '@lingui/macro';
import {
  Box,
  Checkbox,
  Drawer,
  Input,
  NumberInput,
  Space,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconFolder, IconRouter } from '@tabler/icons-react';
import { useQuery } from 'react-query';
import settingsApi from '../../../api/settings.api';
import { useSettings } from '../../../stores/use-settings';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function DescriptionSettings() {
  const { settingsId, settings, reloadSettings } = useSettings();
  return (
    <Box>
      <Title order={3}>
        <Trans>Description Settings</Trans>
      </Title>
      <Space h="sm" />
      <Checkbox
        checked={settings?.allowAd ?? true}
        label={
          <Trans>Allow PostyBirb to insert an Ad into the description</Trans>
        }
        onChange={(e) => {
          settingsApi
            .update(settingsId, {
              settings: {
                ...settings,
                allowAd: e.target.checked,
              },
            })
            .finally(reloadSettings);
        }}
      />
    </Box>
  );
}

function AppSettings() {
  const {
    data: startupSettings,
    isLoading,
    refetch,
  } = useQuery(
    'startup',
    () => settingsApi.getStartupOptions().then((res) => res.body),
    {
      cacheTime: 0,
    }
  );

  if (isLoading) return null;

  return (
    <Box>
      <Title order={3}>
        <Trans>Startup Settings</Trans>
      </Title>
      <Space h="sm" />
      <Stack gap="sm">
        <Checkbox
          checked={startupSettings?.startAppOnSystemStartup ?? false}
          label={<Trans>Open PostyBirb on computer startup</Trans>}
          onChange={(e) => {
            settingsApi
              .updateSystemStartupSettings({
                startAppOnSystemStartup: e.target.checked,
              })
              .finally(refetch);
          }}
        />
        <Input.Wrapper label={<Trans>App Server Port</Trans>}>
          <NumberInput
            value={startupSettings?.port ?? '9487'}
            leftSection={<IconRouter />}
            min={1025}
            max={65535}
            onChange={(newPort) => {
              const port =
                typeof newPort === 'string' ? parseInt(newPort, 10) : newPort;
              if (Number.isNaN(port) || port < 1025 || port > 65535) {
                return;
              }

              settingsApi
                .updateSystemStartupSettings({
                  port: port.toString(),
                })
                .finally(refetch);
            }}
          />
        </Input.Wrapper>
        <Input.Wrapper
          label={<Trans>App Folder</Trans>}
          description={
            <Trans>
              This is the folder where the app will store its data. You must
              restart the app for this to take effect.
            </Trans>
          }
        >
          <Input
            leftSection={<IconFolder />}
            value={startupSettings?.appDataPath ?? ''}
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
          />
        </Input.Wrapper>
      </Stack>
    </Box>
  );
}

export function SettingsDrawer() {
  const [visible, toggle] = useDrawerToggle('settingsDrawerVisible');
  return (
    <Drawer
      withOverlay={false}
      closeOnClickOutside
      ml={-marginOffset}
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
          <Trans>Settings</Trans>
        </Text>
      }
    >
      <Stack gap="xl">
        <AppSettings />
        <DescriptionSettings />
      </Stack>
    </Drawer>
  );
}
