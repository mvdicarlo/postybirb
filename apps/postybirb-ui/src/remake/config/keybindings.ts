/**
 * Keybinding configuration for the PostyBirb remake UI.
 * Defines keyboard shortcuts for navigation and actions.
 */

/* eslint-disable lingui/no-unlocalized-strings */

/**
 * Navigation keybindings
 */
export const SettingsKeybinding = 'Alt+S';
export const AccountKeybinding = 'Alt+A';
export const HomeKeybinding = 'Alt+H';
export const TagGroupsKeybinding = 'Alt+T';
export const TagConvertersKeybinding = 'Alt+C';
export const UserConvertersKeybinding = 'Alt+U';
export const MessageSubmissionsKeybinding = 'Alt+M';
export const NotificationsKeybinding = 'Alt+N';
export const FileSubmissionsKeybinding = 'Alt+F';
export const CustomShortcutsKeybinding = 'Alt+D';
export const FileWatchersKeybinding = 'Alt+W';

/**
 * Editor keybindings
 */
export const UndoKeybinding = 'Control+Z';
export const RedoKeybinding = 'Control+Y';

/**
 * UI keybindings
 */
export const SpotlightKeybinding = 'Control+K';

/**
 * Convert keybinding format to tinykeys format.
 * 'Alt+S' -> 'Alt+s'
 * 'Control+K' -> 'Control+k'
 */
export function toTinykeysFormat(keybinding: string): string {
  return keybinding
    .split('+')
    .map((part, index, arr) =>
      index === arr.length - 1 ? part.toLowerCase() : part
    )
    .join('+');
}
