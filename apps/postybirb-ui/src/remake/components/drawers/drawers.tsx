/**
 * Stub drawer components for the remake UI.
 * These are placeholders that will be implemented later.
 */

import { Trans } from '@lingui/react/macro';
import { Drawer, Stack, Text, Title } from '@mantine/core';
import { useDrawerState, type DrawerStateKey } from '../../stores/drawer-state';

/**
 * Props for stub drawer components.
 */
interface StubDrawerProps {
  drawerKey: DrawerStateKey;
  title: React.ReactNode;
}

/**
 * Base stub drawer component.
 */
function StubDrawer({ drawerKey, title }: StubDrawerProps) {
  const [opened, toggle] = useDrawerState(drawerKey);

  return (
    <Drawer
      opened={opened}
      onClose={toggle}
      title={title}
      position="right"
      size="md"
    >
      <Stack gap="md">
        <Text c="dimmed">
          <Trans>This feature is coming soon.</Trans>
        </Text>
      </Stack>
    </Drawer>
  );
}

/**
 * Settings drawer stub.
 */
export function SettingsDrawer() {
  return (
    <StubDrawer
      drawerKey="settingsDrawerVisible"
      title={<Title order={3}><Trans>Settings</Trans></Title>}
    />
  );
}

/**
 * Account drawer stub.
 */
export function AccountDrawer() {
  return (
    <StubDrawer
      drawerKey="accountDrawerVisible"
      title={<Title order={3}><Trans>Accounts</Trans></Title>}
    />
  );
}

/**
 * Tag groups drawer stub.
 */
export function TagGroupDrawer() {
  return (
    <StubDrawer
      drawerKey="tagGroupsDrawerVisible"
      title={<Title order={3}><Trans>Tag Groups</Trans></Title>}
    />
  );
}

/**
 * Tag converters drawer stub.
 */
export function TagConverterDrawer() {
  return (
    <StubDrawer
      drawerKey="tagConvertersDrawerVisible"
      title={<Title order={3}><Trans>Tag Converters</Trans></Title>}
    />
  );
}

/**
 * User converters drawer stub.
 */
export function UserConverterDrawer() {
  return (
    <StubDrawer
      drawerKey="userConvertersDrawerVisible"
      title={<Title order={3}><Trans>User Converters</Trans></Title>}
    />
  );
}

/**
 * Notifications drawer stub.
 */
export function NotificationsDrawer() {
  return (
    <StubDrawer
      drawerKey="notificationsDrawerVisible"
      title={<Title order={3}><Trans>Notifications</Trans></Title>}
    />
  );
}

/**
 * Custom shortcuts drawer stub.
 */
export function CustomShortcutsDrawer() {
  return (
    <StubDrawer
      drawerKey="customShortcutsDrawerVisible"
      title={<Title order={3}><Trans>Custom Shortcuts</Trans></Title>}
    />
  );
}
