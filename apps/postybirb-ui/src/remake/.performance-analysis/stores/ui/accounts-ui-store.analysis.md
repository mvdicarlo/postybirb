# Performance Analysis

**Source**: `stores/ui/accounts-ui-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/accounts-ui-store.ts`

## Overview
Accounts UI state store with localStorage persistence. Manages hidden websites, search query, and login filter for the accounts section.

## Memoization Usage
- [x] useShallow — in `useAccountsFilter`

## Re-render Triggers
- **`useHiddenWebsites`**: returns array reference — re-renders when hidden websites change. Clean. ✅
- **`useAccountsFilter`**: `useShallow` bundles 7 properties (3 state + 4 actions). Re-renders when any of the 3 state values change.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
- **`useAccountsFilter` is a large selector** — bundling 7 properties means `useShallow` does 7 comparisons on every store update. Since actions are stable, 4 of those comparisons are wasted.
- Minor concern — this store changes infrequently (user filtering accounts).

## Recommendations
- Consider splitting state and actions in `useAccountsFilter`.
- Low priority.

---
*Status*: Analyzed
