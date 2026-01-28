/**
 * Keybinding configuration for the PostyBirb remake UI.
 * Defines keyboard shortcuts for navigation and actions.
 */

/* eslint-disable lingui/no-unlocalized-strings */
import {
  formatKeybindingDisplay,
  getActionModifier,
  getNavigationModifier,
} from '../../shared/platform-utils';

const navMod = getNavigationModifier();
const actionMod = getActionModifier();

/**
 * Navigation keybindings
 */
export const SettingsKeybinding = `${navMod}+S`;
export const AccountKeybinding = `${navMod}+A`;
export const HomeKeybinding = `${navMod}+H`;
export const TagGroupsKeybinding = `${navMod}+T`;
export const TagConvertersKeybinding = `${navMod}+C`;
export const UserConvertersKeybinding = `${navMod}+U`;
export const MessageSubmissionsKeybinding = `${navMod}+M`;
export const NotificationsKeybinding = `${navMod}+N`;
export const FileSubmissionsKeybinding = `${navMod}+F`;
export const CustomShortcutsKeybinding = `${navMod}+D`;
export const FileWatchersKeybinding = `${navMod}+W`;
export const TemplatesKeybinding = `${navMod}+E`;
export const ScheduleKeybinding = `${navMod}+L`;

/**
 * Action keybindings
 */
export const DeleteSelectedKeybinding = 'Delete';

/**
 * Convert keybinding format to tinykeys format.
 * 'Alt+S' -> 'Alt+s'
 * 'Control+K' -> 'Control+k'
 */
export function toTinykeysFormat(keybinding: string): string {
  return keybinding
    .split('+')
    .map((part, index, arr) =>
      index === arr.length - 1 ? part.toLowerCase() : part,
    )
    .join('+');
}

/**
 * Re-export formatKeybindingDisplay for convenience
 */
export { formatKeybindingDisplay };

