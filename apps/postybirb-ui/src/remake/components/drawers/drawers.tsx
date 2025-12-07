/**
 * Stub drawer components for the remake UI.
 * These are placeholders that will be implemented later.
 */

import { Trans } from '@lingui/react/macro';
import { Drawer, Stack, Text, Title } from '@mantine/core';
import { type DrawerKey, useActiveDrawer, useDrawerActions } from '../../stores/ui-store';

// Re-export the SettingsDialog
export { SettingsDialog } from '../dialogs/settings-dialog/settings-dialog';

/**
 * Props for stub drawer components.
 */
interface StubDrawerProps {
  drawerKey: DrawerKey;
  title: React.ReactNode;
}

/**
 * Base stub drawer component.
 */
function StubDrawer({ drawerKey, title }: StubDrawerProps) {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === drawerKey;

  return (
    <Drawer
      opened={opened}
      onClose={closeDrawer}
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
 * Account drawer stub.
 */
export function AccountDrawer() {
  return (
    <StubDrawer
      drawerKey="accounts"
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
      drawerKey="tagGroups"
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
      drawerKey="tagConverters"
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
      drawerKey="userConverters"
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
      drawerKey="notifications"
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
      drawerKey="customShortcuts"
      title={<Title order={3}><Trans>Custom Shortcuts</Trans></Title>}
    />
  );
}
