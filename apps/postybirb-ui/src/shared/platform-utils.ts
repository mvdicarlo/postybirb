/* eslint-disable lingui/no-unlocalized-strings */
/**
 * Platform detection and cross-platform utilities.
 * Provides helpers for detecting the current OS and formatting
 * platform-appropriate keyboard shortcuts.
 */

/**
 * Detect if the current platform is macOS.
 */
export const isMac =
  typeof navigator !== 'undefined' &&
  navigator.platform.toLowerCase().includes('mac');

/**
 * Get the navigation modifier key for tinykeys.
 * Returns 'Control' for macOS (Option key is buggy), 'Alt' for Windows/Linux.
 */
export function getNavigationModifier(): 'Control' | 'Alt' {
  return isMac ? 'Control' : 'Alt';
}

/**
 * Get the action modifier key for tinykeys.
 * Returns 'Meta' for macOS, 'Control' for Windows/Linux.
 */
export function getActionModifier(): 'Meta' | 'Control' {
  return isMac ? 'Meta' : 'Control';
}

/**
 * Format a keybinding string for display.
 * Converts modifier names to platform-appropriate symbols.
 *
 * macOS: Control -> ⌃, Meta -> ⌘, Alt -> ⌥
 * Windows/Linux: Control -> Ctrl, Meta -> Win, Alt -> Alt
 *
 * @param keybinding - The keybinding string (e.g., 'Control+S', 'Alt+H')
 * @returns Formatted string for display (e.g., '⌃S' on Mac, 'Alt+S' on Windows)
 */
export function formatKeybindingDisplay(keybinding: string): string {
  if (isMac) {
    return keybinding
      .replace(/Control\+/g, '⌃')
      .replace(/Meta\+/g, '⌘')
      .replace(/Alt\+/g, '⌥')
      .replace(/Shift\+/g, '⇧');
  }
  return keybinding
    .replace(/Control\+/g, 'Ctrl+')
    .replace(/Meta\+/g, 'Win+');
}
