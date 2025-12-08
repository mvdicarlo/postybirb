/**
 * Drawer components for the remake UI.
 * These are placeholders that will be implemented later.
 * Drawers slide out from the section panel area using custom SectionDrawer.
 */

import { Trans } from '@lingui/react/macro';
import { Stack, Text } from '@mantine/core';
import { type DrawerKey, useActiveDrawer, useDrawerActions } from '../../stores/ui-store';
import { SectionDrawer } from './section-drawer';

// Re-export the SettingsDialog
export { SettingsDialog } from '../dialogs/settings-dialog/settings-dialog';

// Re-export the TagGroupDrawer
export { TagGroupDrawer } from './tag-group-drawer';

/**
 * Props for stub drawer components.
 */
interface StubDrawerProps {
  drawerKey: DrawerKey;
  title: React.ReactNode;
}

/**
 * Base stub drawer component.
 * Uses custom SectionDrawer that slides from the section panel area.
 */
function StubDrawer({ drawerKey, title }: StubDrawerProps) {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === drawerKey;

  return (
    <SectionDrawer
      opened={opened}
      onClose={closeDrawer}
      title={title}
    >
      <Stack gap="md">
        <Text c="dimmed">
          <Trans>This feature is coming soon.</Trans>
        </Text>
      </Stack>
    </SectionDrawer>
  );
}

/**
 * Account drawer stub.
 */
export function AccountDrawer() {
  return (
    <StubDrawer
      drawerKey="accounts"
      title={<Trans>Accounts</Trans>}
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
      title={<Trans>Tag Converters</Trans>}
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
      title={<Trans>User Converters</Trans>}
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
      title={<Trans>Notifications</Trans>}
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
      title={<Trans>Custom Shortcuts</Trans>}
    />
  );
}
