/**
 * Appearance state management using Zustand with localStorage persistence.
 * Manages color scheme, primary color, and submission view mode.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Types
// ============================================================================

/**
 * Color scheme options (matches Mantine's MantineColorScheme).
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * Submission card view mode options.
 */
export type SubmissionViewMode = 'compact' | 'detailed';

/**
 * Valid Mantine primary colors.
 */
export const MANTINE_COLORS = [
  'red',
  'pink',
  'grape',
  'violet',
  'indigo',
  'blue',
  'cyan',
  'teal',
  'green',
  'lime',
  'yellow',
  'orange',
] as const;

export type MantinePrimaryColor = (typeof MANTINE_COLORS)[number];

/**
 * Appearance state interface.
 */
interface AppearanceState {
  /** Current color scheme (light/dark/auto) */
  colorScheme: ColorScheme;

  /** Primary color for the UI */
  primaryColor: MantinePrimaryColor;

  /** Submission card view mode (compact/detailed) */
  submissionViewMode: SubmissionViewMode;
}

/**
 * Appearance actions interface.
 */
interface AppearanceActions {
  /** Set the color scheme */
  setColorScheme: (scheme: ColorScheme) => void;

  /** Set the primary color */
  setPrimaryColor: (color: MantinePrimaryColor) => void;

  /** Set the submission view mode */
  setSubmissionViewMode: (mode: SubmissionViewMode) => void;

  /** Toggle submission view mode between compact and detailed */
  toggleSubmissionViewMode: () => void;

  /** Reset appearance state */
  resetAppearance: () => void;
}

/**
 * Complete Appearance Store type.
 */
export type AppearanceStore = AppearanceState & AppearanceActions;

// ============================================================================
// Constants
// ============================================================================

/**
 * Storage key for localStorage persistence.
 */
const STORAGE_KEY = 'postybirb-appearance';

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial/default appearance state.
 */
const initialState: AppearanceState = {
  colorScheme: 'auto',
  primaryColor: 'teal',
  submissionViewMode: 'detailed',
};

// ============================================================================
// Store
// ============================================================================

/**
 * Zustand store for appearance with localStorage persistence.
 */
export const useAppearanceStore = create<AppearanceStore>()(
  persist(
    (set) => ({
      // Initial state
      ...initialState,

      // Actions
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setPrimaryColor: (primaryColor) => set({ primaryColor }),
      setSubmissionViewMode: (submissionViewMode) => set({ submissionViewMode }),
      toggleSubmissionViewMode: () =>
        set((state) => ({
          submissionViewMode:
            state.submissionViewMode === 'compact' ? 'detailed' : 'compact',
        })),

      // Reset to initial state
      resetAppearance: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// ============================================================================
// Selector Hooks
// ============================================================================

/** Select color scheme */
export const useColorScheme = () =>
  useAppearanceStore((state) => state.colorScheme);

/** Select primary color */
export const usePrimaryColor = () =>
  useAppearanceStore((state) => state.primaryColor);

/** Select appearance actions */
export const useAppearanceActions = () =>
  useAppearanceStore(
    useShallow((state) => ({
      colorScheme: state.colorScheme,
      primaryColor: state.primaryColor,
      setColorScheme: state.setColorScheme,
      setPrimaryColor: state.setPrimaryColor,
    })),
  );

/** Select submission view mode state and actions */
export const useSubmissionViewMode = () =>
  useAppearanceStore(
    useShallow((state) => ({
      viewMode: state.submissionViewMode,
      setViewMode: state.setSubmissionViewMode,
      toggleViewMode: state.toggleSubmissionViewMode,
    })),
  );

/** Check if submission view is compact */
export const useIsCompactView = () =>
  useAppearanceStore((state) => state.submissionViewMode === 'compact');
