# Performance Analysis

**Source**: `hooks/use-keybindings.ts`
**Full Path**: `apps/postybirb-ui/src/remake/hooks/use-keybindings.ts`

## Overview
Hook that sets up global keyboard shortcuts via `tinykeys`. Handles both navigation (view state changes) and drawer toggles. Also handles mouse back/forward buttons.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — N/A

## Re-render Triggers
- Subscribes to `useViewStateActions`, `useDrawerStore`, `useNavigationHistory`, `useCanGoBack`, `useCanGoForward` — 5 store subscriptions.
- **`useEffect` re-runs when any of its 6 dependencies change**: `setViewState`, `toggleDrawer`, `goBack`, `goForward`, `canGoBack`, `canGoForward`.

## Store Subscriptions
- `useDrawerStore` (for `toggleDrawer`)
- `useNavigationStore` (via `useViewStateActions`, `useCanGoBack`, `useCanGoForward`, `useNavigationHistory`)

## Potential Issues
- ~~**⚠️ `useEffect` re-runs on every navigation** — `canGoBack` and `canGoForward` change on every navigation event, which tears down and re-creates all keyboard listeners + the mouse listener. The `tinykeys` unsubscribe/resubscribe is lightweight but runs on every navigation.~~ **Fixed** — `canGoBack`/`canGoForward` now stored in refs; effect only depends on stable action refs.
- **Creates view state objects inline** (`createHomeViewState()`, etc.) inside the effect — these are cheap factory calls, but they run on every effect re-execution.

## Recommendations
- ~~Consider splitting the effect: one stable effect for keyboard shortcuts (actions are stable refs), and a separate effect that only handles the `canGoBack`/`canGoForward`-dependent mouse button logic.~~ **Done** (via refs approach instead — simpler, same result).
- ~~Or use refs for `canGoBack`/`canGoForward` to avoid effect re-runs.~~ **Done.**

---
*Status*: Analyzed
