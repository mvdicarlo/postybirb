/**
 * Keybindings hook using tinykeys for keyboard shortcuts.
 * Sets up global keyboard listeners for navigation and actions.
 */

import { useEffect, useRef } from 'react';
import { tinykeys } from 'tinykeys';
import { getActionModifier } from '../../shared/platform-utils';
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
import { useDrawerStore } from '../stores/ui/drawer-store';
import {
    useCanGoBack,
    useCanGoForward,
    useNavigationHistory,
    useViewStateActions,
} from '../stores/ui/navigation-store';
import {
    createAccountsViewState,
    createFileSubmissionsViewState,
    createHomeViewState,
    createMessageSubmissionsViewState,
    createTemplatesViewState,
} from '../types/view-state';

/**
 * Hook to set up global keybindings using tinykeys.
 * Handles both navigation and drawer toggle shortcuts.
 */
export function useKeybindings(): void {
  const { setViewState } = useViewStateActions();
  const toggleDrawer = useDrawerStore((state) => state.toggleDrawer);
  const { goBack, goForward } = useNavigationHistory();
  const canGoBack = useCanGoBack();
  const canGoForward = useCanGoForward();

  // Store navigation state in refs so the effect doesn't re-run on every navigation.
  // This avoids tearing down and re-creating all keyboard + mouse listeners
  // every time canGoBack/canGoForward changes.
  const canGoBackRef = useRef(canGoBack);
  const canGoForwardRef = useRef(canGoForward);
  canGoBackRef.current = canGoBack;
  canGoForwardRef.current = canGoForward;

  useEffect(() => {
    const mod = getActionModifier();

    // Mouse button handler for back/forward navigation
    const handleMouseButton = (event: MouseEvent) => {
      // Button 3 (back) and Button 4 (forward)
      if (event.button === 3 && canGoBackRef.current) {
        event.preventDefault();
        goBack();
      } else if (event.button === 4 && canGoForwardRef.current) {
        event.preventDefault();
        goForward();
      }
    };

    // Add mouse button listener
    window.addEventListener('mouseup', handleMouseButton);

    const unsubscribe = tinykeys(window, {
      // History navigation keybindings
      [`${mod}+[`]: (event: KeyboardEvent) => {
        if (canGoBackRef.current) {
          event.preventDefault();
          goBack();
        }
      },
      [`${mod}+]`]: (event: KeyboardEvent) => {
        if (canGoForwardRef.current) {
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
  // canGoBack/canGoForward read from refs — not needed as dependencies
  }, [setViewState, toggleDrawer, goBack, goForward]);
}
