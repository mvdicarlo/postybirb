# Performance Analysis

**Source**: `stores/ui/navigation-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/navigation-store.ts`

## Overview
Navigation state store with localStorage persistence. Manages current view state, view state cache (per-section), and navigation history (back/forward). Uses `persist` middleware. Contains `validateViewState` which reads from other stores.

## Memoization Usage
- [x] useShallow — in `useViewStateActions`, `useNavigationHistory`

## Re-render Triggers
- **`useViewState`**: re-renders when view state changes (navigation events). This is expected and correct.
- **`validateViewState` reads from `useSubmissionStore` and `useAccountStore`** via `.getState()` — this is a sync read outside React, so it doesn't create subscriptions. However, it's called during `setViewState`, which means navigation checks validity against possibly-stale store state.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
- **`validateViewState` accessing other stores** introduces a cross-store dependency at the store layer. If stores aren't loaded yet (e.g., during initial navigation restore from localStorage), `recordsMap` could be empty, causing all selections to be "invalid" and cleared.
- **History management creates new arrays** on every navigation — `[...prev.navigationHistory.slice(...), newSectionId]`. Minor GC pressure.
- **localStorage persistence** — writes to localStorage on every navigation change. `JSON.stringify` of the full state (including viewStateCache with potentially many entries) runs synchronously on the main thread.

## Recommendations
- Consider debouncing localStorage persistence for rapid navigation changes.
- The `validateViewState` cross-store read is acceptable but should have a guard for unloaded stores.
- ~~Remove unnecessary `useShallow` from `useNavigationHistory` — both action refs are stable.~~ **Done.**

---
*Status*: Analyzed
