/* eslint-disable lingui/no-unlocalized-strings */
import {
    formatKeybindingDisplay,
    getActionModifier,
    getNavigationModifier,
} from './platform-utils';

const navMod = getNavigationModifier();
const actionMod = getActionModifier();

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
export const SpotlightKeybinding = `${actionMod}+K`;

/**
 * Format a keybinding for display in the UI.
 * Converts to platform-appropriate symbols.
 */
export { formatKeybindingDisplay };

