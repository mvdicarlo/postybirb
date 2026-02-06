# Performance Analysis

**Source**: `stores/store-init.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/store-init.ts`

## Overview
Store initialization utilities. Provides `loadAllStores()` (parallel fetch of all 10 entity stores), `useInitializeStores()` hook (React lifecycle wrapper), `areAllStoresLoaded()` (sync check), and `clearAllStores()`.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — N/A

## Re-render Triggers
- `useInitializeStores` uses `useState` for `isInitialized`, `isLoading`, `error` — triggers re-render when loading completes. This is expected.

## Store Subscriptions
Accesses all 10 entity stores via `.getState()` (outside React, no subscription).

## Potential Issues
- **`loadAllStores` fires 10 parallel API requests** — on app startup, this bursts 10 simultaneous HTTP calls. Depending on the backend, this could cause connection pool pressure or rate limiting.
- **`useInitializeStores` doesn't use `loadAllStores` result effectively** — it catches errors but only stores the message of the first error; if multiple stores fail, only one error is reported.
- **`areAllStoresLoaded` is called outside of React** — it's a snapshot check, not reactive. If used in a component, it won't update when stores finish loading.

## Recommendations
- Consider batching the 10 initial API calls into 2-3 groups if backend connection pooling is limited.
- Minor concern — no significant UI performance impact since this only runs once at startup.

---
*Status*: Analyzed
