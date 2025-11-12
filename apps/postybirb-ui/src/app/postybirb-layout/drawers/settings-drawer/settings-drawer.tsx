import { Trans } from '@lingui/react/macro';
import {
  Box,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import {
  IconBell,
  IconDeviceDesktop,
  IconFileDescription,
  IconRouter,
  IconTags,
} from '@tabler/icons-react';
import { useState } from 'react';
import { ComponentErrorBoundary } from '../../../../components/error-boundary/specialized-error-boundaries';
import {
  getOverlayOffset,
  getPortalTarget,
  marginOffset,
} from '../drawer.util';
import { useDrawerToggle } from '../use-drawer-toggle';
import { AppSettings } from './app-settings';
import { DescriptionSettings } from './description-settings';
import { NotificationsSettings } from './notifications-settings';
import { RemoteSettings } from './remote-settings';
import { TagsSettings } from './tags-settings';

export function SettingsDrawer() {
  const [visible, toggle] = useDrawerToggle('settingsDrawerVisible');
  const [activeTab, setActiveTab] = useState<string | null>('app');

  return (
    <ComponentErrorBoundary>
      <Drawer
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
                // eslint-disable-next-line lingui/no-unlocalized-strings
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
                <Tabs.Tab
                  value="notifications"
                  leftSection={<IconBell size={16} />}
                  fw={activeTab === 'notifications' ? 'bold' : 'normal'}
                >
                  <Trans>Notifications</Trans>
                </Tabs.Tab>
                <Tabs.Tab
                  value="remote"
                  leftSection={<IconRouter size={16} />}
                  fw={activeTab === 'remote' ? 'bold' : 'normal'}
                >
                  <Trans>Remote</Trans>
                </Tabs.Tab>

                <Tabs.Tab
                  value="tags"
                  leftSection={<IconTags size={16} />}
                  fw={activeTab === 'tags' ? 'bold' : 'normal'}
                >
                  <Trans>Tags</Trans>
                </Tabs.Tab>
              </Tabs.List>

              <ScrollArea h="100%" offsetScrollbars>
                <Box>
                  {activeTab === 'app' && <AppSettings />}
                  {activeTab === 'description' && <DescriptionSettings />}
                  {activeTab === 'notifications' && <NotificationsSettings />}
                  {activeTab === 'remote' && <RemoteSettings />}
                  {activeTab === 'tags' && <TagsSettings />}
                </Box>
              </ScrollArea>
            </Group>
          </Tabs>
        </Stack>
      </Drawer>
    </ComponentErrorBoundary>
  );
}
