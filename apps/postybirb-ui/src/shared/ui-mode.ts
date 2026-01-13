/**
 * Shared UI mode constants for both legacy and remake UIs.
 * This allows users to toggle between UI versions during A/B testing.
 */

export const POSTYBIRB_UI_MODE_KEY = 'postybirb-ui-mode';

export type UIMode = 'remake' | 'legacy';

export const DEFAULT_UI_MODE: UIMode = 'remake';

/**
 * Get the current UI mode from localStorage.
 * Defaults to 'remake' if not set or invalid.
 */
export function getUIMode(): UIMode {
  try {
    const stored = localStorage.getItem(POSTYBIRB_UI_MODE_KEY);
    if (stored === 'legacy' || stored === 'remake') {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_UI_MODE;
}

/**
 * Set the UI mode in localStorage.
 */
export function setUIMode(mode: UIMode): void {
  try {
    localStorage.setItem(POSTYBIRB_UI_MODE_KEY, mode);
  } catch {
    // localStorage may not be available
  }
}
