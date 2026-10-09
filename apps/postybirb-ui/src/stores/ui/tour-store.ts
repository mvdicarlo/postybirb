/**
 * Tour UI state management using Zustand with localStorage persistence.
 * Tracks which tours have been completed/skipped and which tour is active.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Types
// ============================================================================

interface TourState {
  /** Map of tour ID to completion status */
  completedTours: Record<string, boolean>;

  /** Currently active tour ID, or null if no tour is running */
  activeTourId: string | null;

  /** Whether the active tour is currently started/running */
  tourStarted: boolean;
}

interface TourActions {
  /** Start a specific tour by ID */
  startTour: (tourId: string) => void;

  /** Mark a tour as completed (user finished all steps) */
  completeTour: (tourId: string) => void;

  /** Mark a tour as skipped (user dismissed early) */
  skipTour: (tourId: string) => void;

  /** End the currently running tour (cleanup) */
  endTour: () => void;

  /** Reset a specific tour so it can be re-triggered */
  resetTour: (tourId: string) => void;

  /** Reset all tours */
  resetAllTours: () => void;
}

type TourStore = TourState & TourActions;

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'postybirb-tour-state';

// ============================================================================
// Initial State
// ============================================================================

const initialState: TourState = {
  completedTours: {},
  activeTourId: null,
  tourStarted: false,
};

// ============================================================================
// Store
// ============================================================================

export const useTourStore = create<TourStore>()(
  persist(
    (set) => ({
      ...initialState,

      startTour: (tourId) =>
        set({ activeTourId: tourId, tourStarted: true }),

      completeTour: (tourId) =>
        set((state) => ({
          completedTours: { ...state.completedTours, [tourId]: true },
          activeTourId: null,
          tourStarted: false,
        })),

      skipTour: (tourId) =>
        set((state) => ({
          completedTours: { ...state.completedTours, [tourId]: true },
          activeTourId: null,
          tourStarted: false,
        })),

      endTour: () =>
        set({ activeTourId: null, tourStarted: false }),

      resetTour: (tourId) =>
        set((state) => {
          const { [tourId]: _, ...rest } = state.completedTours;
          return { completedTours: rest };
        }),

      resetAllTours: () =>
        set({ completedTours: {}, activeTourId: null, tourStarted: false }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist completedTours — active tour state resets between sessions
      partialize: (state) => ({
        completedTours: state.completedTours,
      }),
    },
  ),
);

// ============================================================================
// Selector Hooks
// ============================================================================

export function useActiveTourId() {
  return useTourStore((state) => state.activeTourId);
}

export function useTourStarted() {
  return useTourStore((state) => state.tourStarted);
}

export function useIsTourCompleted(tourId: string) {
  return useTourStore((state) => !!state.completedTours[tourId]);
}

export function useTourActions() {
  return useTourStore(
    useShallow((state) => ({
      startTour: state.startTour,
      completeTour: state.completeTour,
      skipTour: state.skipTour,
      endTour: state.endTour,
      resetTour: state.resetTour,
      resetAllTours: state.resetAllTours,
    })),
  );
}
