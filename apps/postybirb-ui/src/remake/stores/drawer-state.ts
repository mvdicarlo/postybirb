/**
 * Global drawer state management for the remake UI.
 * Provides a simple store for drawer visibility states.
 */

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Drawer state keys that can be toggled.
 */
export type DrawerStateKey =
  | 'settingsDrawerVisible'
  | 'accountDrawerVisible'
  | 'tagGroupsDrawerVisible'
  | 'tagConvertersDrawerVisible'
  | 'userConvertersDrawerVisible'
  | 'notificationsDrawerVisible'
  | 'customShortcutsDrawerVisible';

/**
 * Global state for all drawer visibilities.
 */
type DrawerState = Record<DrawerStateKey, boolean>;

/**
 * Initial drawer state - all closed.
 */
const initialState: DrawerState = {
  settingsDrawerVisible: false,
  accountDrawerVisible: false,
  tagGroupsDrawerVisible: false,
  tagConvertersDrawerVisible: false,
  userConvertersDrawerVisible: false,
  notificationsDrawerVisible: false,
  customShortcutsDrawerVisible: false,
};

/**
 * Simple store for drawer state.
 */
let state: DrawerState = { ...initialState };
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/**
 * Get the current drawer state.
 */
export function getDrawerState(): DrawerState {
  return state;
}

/**
 * Toggle a specific drawer's visibility.
 */
export function toggleDrawer(key: DrawerStateKey): void {
  state = { ...state, [key]: !state[key] };
  notifyListeners();
}

/**
 * Set a specific drawer's visibility.
 */
export function setDrawerVisible(key: DrawerStateKey, visible: boolean): void {
  if (state[key] !== visible) {
    state = { ...state, [key]: visible };
    notifyListeners();
  }
}

/**
 * Close all drawers.
 */
export function closeAllDrawers(): void {
  state = { ...initialState };
  notifyListeners();
}

/**
 * Subscribe to drawer state changes.
 */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Hook to access and toggle drawer state.
 */
export function useDrawerState(key: DrawerStateKey): [boolean, () => void] {
  const currentState = useSyncExternalStore(
    subscribe,
    () => getDrawerState()[key],
    () => initialState[key]
  );

  const toggle = useCallback(() => {
    toggleDrawer(key);
  }, [key]);

  return [currentState, toggle];
}

/**
 * Hook to access all drawer states.
 */
export function useDrawerStates(): DrawerState {
  return useSyncExternalStore(
    subscribe,
    getDrawerState,
    () => initialState
  );
}
