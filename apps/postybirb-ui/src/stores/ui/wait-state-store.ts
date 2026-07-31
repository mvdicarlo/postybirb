/**
 * Transient store for rate-limit wait states.
 * Populated via WebSocket pushes and API calls on mount.
 * Not persisted — cleared on page reload (then refetched from API).
 */

import { POST_WAIT_STATE } from '@postybirb/socket-events';
import { IPostWaitState } from '@postybirb/types';
import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import postApi from '../../api/post.api';
import AppSocket from '../../transports/websocket';

// ============================================================================
// Types
// ============================================================================

interface WaitStateStore {
  /** Currently active wait states keyed by accountId for fast lookup */
  waitStates: IPostWaitState[];

  /** Replace all wait states (from WebSocket push) */
  setWaitStates: (states: IPostWaitState[]) => void;

  /** Clear expired wait states */
  pruneExpired: () => void;

  /** Fetch initial state from API */
  fetchWaitStates: () => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

const useWaitStateStore = create<WaitStateStore>((set, get) => ({
  waitStates: [],

  setWaitStates: (states) => set({ waitStates: states }),

  pruneExpired: () => {
    const now = Date.now();
    set((state) => ({
      waitStates: state.waitStates.filter(
        (ws) => new Date(ws.waitUntil).getTime() > now,
      ),
    }));
  },

  fetchWaitStates: async () => {
    try {
      const response = await postApi.getWaitStates();
      set({ waitStates: response.body });
    } catch {
      // Silently fail — wait states are non-critical
    }
  },
}));

// ============================================================================
// WebSocket listener
// ============================================================================

AppSocket.on(POST_WAIT_STATE, (data: IPostWaitState[]) => {
  useWaitStateStore.getState().setWaitStates(data);
});

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all active wait states.
 */
export const useWaitStates = (): IPostWaitState[] =>
  useWaitStateStore(useShallow((state) => state.waitStates));

/**
 * Get wait state actions (fetch, prune).
 */
export const useWaitStateActions = () =>
  useWaitStateStore(
    useShallow((state) => ({
      fetchWaitStates: state.fetchWaitStates,
      pruneExpired: state.pruneExpired,
    })),
  );
