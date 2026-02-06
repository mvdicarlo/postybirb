# Performance Analysis

**Source**: `transports/websocket.ts`
**Full Path**: `apps/postybirb-ui/src/remake/transports/websocket.ts`

## Overview
Creates and exports a singleton Socket.IO client (`AppSocket`) connected to the backend. Configures auto-reconnection with backoff and logs connection lifecycle events.

## Memoization Usage
- [x] useMemo — N/A (no React)
- [x] useCallback — N/A (no React)
- [x] React.memo — N/A (no React)

No React hooks — module-level singleton.

## Re-render Triggers
N/A — not a React component or hook.

## Store Subscriptions
None directly. Multiple stores subscribe to this socket's events.

## Potential Issues
- **Module-level side effects**: `getRemotePassword()` and `defaultTargetProvider()` are called at module evaluation time (import time). If `window.electron` or `localStorage` aren't ready, this could fail silently or connect to the wrong host.
- **`console.log` / `console.warn` on every lifecycle event** — not a perf issue but adds noise. Could be gated behind a debug flag.
- **Reconnection attempts = Infinity** — will never stop trying, which is fine for desktop but could drain battery on constrained devices.

## Recommendations
- No significant performance concerns.
- Could lazily initialize the connection rather than at import-time to avoid race conditions during app bootstrap.

---
*Status*: Analyzed
