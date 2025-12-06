/**
 * Keybindings hook using tinykeys for keyboard shortcuts.
 * Sets up global keyboard listeners for navigation and actions.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tinykeys } from 'tinykeys';
import {
    AccountKeybinding,
    CustomShortcutsKeybinding,
    FileSubmissionsKeybinding,
    HomeKeybinding,
    MessageSubmissionsKeybinding,
    NotificationsKeybinding,
    SettingsKeybinding,
    TagConvertersKeybinding,
    TagGroupsKeybinding,
    toTinykeysFormat,
    UserConvertersKeybinding,
} from '../config/keybindings';
import { toggleDrawer } from '../stores/drawer-state';

/**
 * Route paths for navigation keybindings.
 */
const RoutePaths = {
  Home: '/',
  FileSubmissions: '/file-submissions',
  MessageSubmissions: '/message-submissions',
} as const;

/**
 * Hook to set up global keybindings using tinykeys.
 * Handles both navigation and drawer toggle shortcuts.
 */
export function useKeybindings(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      // Navigation keybindings
      [toTinykeysFormat(HomeKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        navigate(RoutePaths.Home);
      },
      [toTinykeysFormat(FileSubmissionsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        navigate(RoutePaths.FileSubmissions);
      },
      [toTinykeysFormat(MessageSubmissionsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        navigate(RoutePaths.MessageSubmissions);
      },

      // Drawer toggle keybindings
      [toTinykeysFormat(SettingsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('settingsDrawerVisible');
      },
      [toTinykeysFormat(AccountKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('accountDrawerVisible');
      },
      [toTinykeysFormat(TagGroupsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('tagGroupsDrawerVisible');
      },
      [toTinykeysFormat(TagConvertersKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('tagConvertersDrawerVisible');
      },
      [toTinykeysFormat(UserConvertersKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('userConvertersDrawerVisible');
      },
      [toTinykeysFormat(NotificationsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('notificationsDrawerVisible');
      },
      [toTinykeysFormat(CustomShortcutsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('customShortcutsDrawerVisible');
      },
    });

    return unsubscribe;
  }, [navigate]);
}
