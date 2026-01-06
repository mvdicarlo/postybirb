/**
 * Drawer components for the remake UI.
 * These are placeholders that will be implemented later.
 * Drawers slide out from the section panel area using custom SectionDrawer.
 */

import {
  useActiveDrawer,
  useDrawerActions
} from '../../stores/drawer-store';

// Import the CustomShortcutsDrawer implementation for wrapping
import { CustomShortcutsDrawer as CustomShortcutsDrawerComponent } from './custom-shortcuts-drawer';

// Re-export the SettingsDialog
export { SettingsDialog } from '../dialogs/settings-dialog/settings-dialog';

// Re-export the TagGroupDrawer
export { TagGroupDrawer } from './tag-group-drawer';

// Re-export the NotificationsDrawer
export { NotificationsDrawer } from './notifications-drawer';

// Re-export the TagConverterDrawer
export { TagConverterDrawer } from './tag-converter-drawer';

// Re-export the UserConverterDrawer
export { UserConverterDrawer } from './user-converter-drawer';

// Re-export the FileWatcherDrawer
export { FileWatcherDrawer } from './file-watcher-drawer';

// Re-export the ScheduleDrawer
export { ScheduleDrawer } from './schedule-drawer';

/**
 * Custom shortcuts drawer wrapper.
 * Connects the drawer to the UI store.
 */
export function CustomShortcutsDrawer() {
  const activeDrawer = useActiveDrawer();
  const { closeDrawer } = useDrawerActions();
  const opened = activeDrawer === 'customShortcuts';

  return (
    <CustomShortcutsDrawerComponent opened={opened} onClose={closeDrawer} />
  );
}
