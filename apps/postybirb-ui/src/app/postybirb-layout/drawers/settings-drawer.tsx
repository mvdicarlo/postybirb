/* eslint-disable lingui/no-unlocalized-strings */
import { Trans, msg } from '@lingui/macro';
import { useLingui } from '@lingui/react';
import {
  Box,
  Button,
  Card,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconDeviceDesktop,
  IconFileDescription,
  IconFolder,
  IconRouter,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useQuery } from 'react-query';
import settingsApi from '../../../api/settings.api';
import { useSettings } from '../../../stores/use-settings';
import { getOverlayOffset, getPortalTarget, marginOffset } from './drawer.util';
import { useDrawerToggle } from './use-drawer-toggle';

function DescriptionSettings() {
  const { settingsId, settings, reloadSettings } = useSettings();

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section withBorder inheritPadding py="xs">
        <Group>
          <IconFileDescription size={20} />
          <Text fw={500} size="lg">
            <Trans>Description Settings</Trans>
          </Text>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="md">
        <Switch
          label={
            <Group gap="xs">
              <Text>
                <Trans>
                  Allow PostyBirb to insert an Ad into the description
                </Trans>
              </Text>
            </Group>
          }
          checked={settings?.allowAd ?? true}
          onChange={(event) => {
            settingsApi
              .update(settingsId, {
                settings: {
                  ...settings,
                  allowAd: event.currentTarget.checked,
                },
              })
              .finally(reloadSettings);
          }}
        />
      </Stack>
    </Card>
  );
}

function AppSettings() {
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

export function SettingsDrawer() {
  const [visible, toggle] = useDrawerToggle('settingsDrawerVisible');
  const [activeTab, setActiveTab] = useState<string | null>('app');

  return (
    <Drawer
      withOverlay={false}
      closeOnClickOutside
      ml={-marginOffset}
      size="lg"
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
      styles={{
        body: {
          padding: '16px',
          height: 'calc(100% - 60px)',
        },
      }}
    >
      <Stack gap="md" h="100%">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          variant="outline"
          orientation="vertical"
          styles={{
            list: {
              flex: '0 0 125px',
            },
            panel: {
              flex: 1,
              padding: '16px',
            },
          }}
        >
          <Group h="100%" align="stretch" wrap="nowrap">
            <Tabs.List>
              <Tabs.Tab
                value="app"
                leftSection={<IconDeviceDesktop size={16} />}
                fw={activeTab === 'app' ? 'bold' : 'normal'}
              >
                <Trans>App</Trans>
              </Tabs.Tab>
              <Tabs.Tab
                value="description"
                leftSection={<IconFileDescription size={16} />}
                fw={activeTab === 'description' ? 'bold' : 'normal'}
              >
                <Trans>Description</Trans>
              </Tabs.Tab>
            </Tabs.List>

            <ScrollArea h="100%" offsetScrollbars>
              <Box>
                {activeTab === 'app' && <AppSettings />}
                {activeTab === 'description' && <DescriptionSettings />}
              </Box>
            </ScrollArea>
          </Group>
        </Tabs>
      </Stack>
    </Drawer>
  );
}
