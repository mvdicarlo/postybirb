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
  ScheduleKeybinding,
  SettingsKeybinding,
  TagConvertersKeybinding,
  TagGroupsKeybinding,
  TemplatesKeybinding,
  toTinykeysFormat,
  UserConvertersKeybinding,
} from '../config/keybindings';
import {
  useCanGoBack,
  useCanGoForward,
  useNavigationHistory,
  useUIStore,
  useViewStateActions,
} from '../stores/ui-store';
import {
  createAccountsViewState,
  createFileSubmissionsViewState,
  createHomeViewState,
  createMessageSubmissionsViewState,
  createTemplatesViewState,
} from '../types/view-state';

/**
 * Get the current platform's modifier key format for tinykeys.
 * Returns 'Meta' for macOS, 'Control' for Windows/Linux.
 */
const getModifierKey = (): 'Meta' | 'Control' => {
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform.toLowerCase();
    // eslint-disable-next-line lingui/no-unlocalized-strings
    return platform.includes('mac') ? 'Meta' : 'Control';
  }
  // eslint-disable-next-line lingui/no-unlocalized-strings
  return 'Control';
};

/**
 * Hook to set up global keybindings using tinykeys.
 * Handles both navigation and drawer toggle shortcuts.
 */
export function useKeybindings(): void {
  const { setViewState } = useViewStateActions();
  const toggleDrawer = useUIStore((state) => state.toggleDrawer);
  const { goBack, goForward } = useNavigationHistory();
  const canGoBack = useCanGoBack();
  const canGoForward = useCanGoForward();

  useEffect(() => {
    const mod = getModifierKey();

    // Mouse button handler for back/forward navigation
    const handleMouseButton = (event: MouseEvent) => {
      // Button 3 (back) and Button 4 (forward)
      if (event.button === 3 && canGoBack) {
        event.preventDefault();
        goBack();
      } else if (event.button === 4 && canGoForward) {
        event.preventDefault();
        goForward();
      }
    };

    // Add mouse button listener
    window.addEventListener('mouseup', handleMouseButton);

    const unsubscribe = tinykeys(window, {
      // History navigation keybindings
      [`${mod}+[`]: (event: KeyboardEvent) => {
        if (canGoBack) {
          event.preventDefault();
          goBack();
        }
      },
      [`${mod}+]`]: (event: KeyboardEvent) => {
        if (canGoForward) {
          event.preventDefault();
          goForward();
        }
      },

      // Navigation keybindings
      [toTinykeysFormat(HomeKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createHomeViewState());
      },
      [toTinykeysFormat(FileSubmissionsKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createFileSubmissionsViewState());
      },
      [toTinykeysFormat(MessageSubmissionsKeybinding)]: (
        event: KeyboardEvent,
      ) => {
        event.preventDefault();
        setViewState(createMessageSubmissionsViewState());
      },
      [toTinykeysFormat(AccountKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createAccountsViewState());
      },
      [toTinykeysFormat(TemplatesKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        setViewState(createTemplatesViewState());
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
      [toTinykeysFormat(ScheduleKeybinding)]: (event: KeyboardEvent) => {
        event.preventDefault();
        toggleDrawer('schedule');
      },
    });

    return () => {
      unsubscribe();
      window.removeEventListener('mouseup', handleMouseButton);
    };
  }, [setViewState, toggleDrawer, goBack, goForward, canGoBack, canGoForward]);
}
