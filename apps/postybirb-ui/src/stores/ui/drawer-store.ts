/**
 * Drawer state management using Zustand.
 * Manages which drawer is currently open (only one at a time).
 * No persistence - drawers reset to closed on page reload.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';

// ============================================================================
// Types
// ============================================================================

/**
 * Drawer visibility keys.
 */
export type DrawerKey =
  | 'settings'
  | 'tagGroups'
  | 'tagConverters'
  | 'userConverters'
  | 'notifications'
  | 'customShortcuts'
  | 'fileWatchers'
  | 'schedule';

/**
 * Drawer state interface.
 */
interface DrawerState {
  /** Currently active drawer, or null if none is open */
  activeDrawer: DrawerKey | null;
}

/**
 * Drawer actions interface.
 */
interface DrawerActions {
  /** Open a specific drawer */
  openDrawer: (drawer: DrawerKey) => void;

  /** Close the currently open drawer */
  closeDrawer: () => void;

  /** Toggle a specific drawer */
  toggleDrawer: (drawer: DrawerKey) => void;
}

/**
 * Complete Drawer Store type.
 */
export type DrawerStore = DrawerState & DrawerActions;

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default drawer state.
 */
const initialState: DrawerState = {
  activeDrawer: null,
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for drawer state.
 * No persistence - drawers always start closed.
 */
export const useDrawerStore = create<DrawerStore>()((set) => ({
  // Initial state
  ...initialState,

  // Actions
  openDrawer: (drawer) => set({ activeDrawer: drawer }),
  closeDrawer: () => set({ activeDrawer: null }),
  toggleDrawer: (drawer) =>
    set((state) => ({
      activeDrawer: state.activeDrawer === drawer ? null : drawer,
    })),
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/** Select active drawer */
export const useActiveDrawer = () =>
  useDrawerStore((state) => state.activeDrawer);

/** Select drawer actions — useShallow required because selector returns an object literal */
export const useDrawerActions = () =>
  useDrawerStore(
    useShallow((state) => ({
      openDrawer: state.openDrawer,
      closeDrawer: state.closeDrawer,
      toggleDrawer: state.toggleDrawer,
    }))
  );

/** Check if a specific drawer is open */
export const useIsDrawerOpen = (drawer: DrawerKey) =>
  useDrawerStore((state) => state.activeDrawer === drawer);
