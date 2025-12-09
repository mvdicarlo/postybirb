/**
 * Keybindings hook using tinykeys for keyboard shortcuts.
 * Sets up global keyboard listeners for navigation and actions.
 */

import { useEffect } from 'react';
import { tinykeys } from 'tinykeys';
import {
    AccountKeybinding,
    CustomShortcutsKeybinding,
    FileSubmissionsKeybinding,
    FileWatchersKeybinding,
    HomeKeybinding,
    MessageSubmissionsKeybinding,
    NotificationsKeybinding,
    SettingsKeybinding,
    TagConvertersKeybinding,
    TagGroupsKeybinding,
    toTinykeysFormat,
    UserConvertersKeybinding,
} from '../config/keybindings';
import { useUIStore, useViewStateActions } from '../stores/ui-store';
import {
    createAccountsViewState,
    createFileSubmissionsViewState,
    createHomeViewState,
    createMessageSubmissionsViewState,
} from '../types/view-state';

/**
 * Hook to set up global keybindings using tinykeys.
 * Handles both navigation and drawer toggle shortcuts.
 */
export function useKeybindings(): void {
  const { setViewState } = useViewStateActions();
  const toggleDrawer = useUIStore((state) => state.toggleDrawer);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      // Navigation keybindings
      [toTinykeysFormat(HomeKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createHomeViewState());
      },
      [toTinykeysFormat(FileSubmissionsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createFileSubmissionsViewState());
      },
      [toTinykeysFormat(MessageSubmissionsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createMessageSubmissionsViewState());
      },
      [toTinykeysFormat(AccountKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createAccountsViewState());
      },

      // Drawer toggle keybindings
      [toTinykeysFormat(SettingsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('settings');
      },
      [toTinykeysFormat(TagGroupsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('tagGroups');
      },
      [toTinykeysFormat(TagConvertersKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('tagConverters');
      },
      [toTinykeysFormat(UserConvertersKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('userConverters');
      },
      [toTinykeysFormat(NotificationsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('notifications');
      },
      [toTinykeysFormat(CustomShortcutsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('customShortcuts');
      },
      [toTinykeysFormat(FileWatchersKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('fileWatchers');
      },
    });

    return unsubscribe;
  }, [setViewState, toggleDrawer]);
}
