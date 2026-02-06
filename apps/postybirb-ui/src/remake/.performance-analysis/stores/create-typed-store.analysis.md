# Performance Analysis

**Source**: `stores/create-typed-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/create-typed-store.ts`

## Overview
Higher-level factory that wraps `createEntityStore` and generates standard selector hooks (`useRecords`, `useRecordsMap`, `useLoading`, `useActions`). Reduces per-store boilerplate from ~70 lines to ~15 lines.

## Memoization Usage
- [x] useShallow — used in ALL generated hooks (`useRecords`, `useRecordsMap`, `useLoading`, `useActions`)

## Re-render Triggers
All generated hooks use `useShallow` which helps prevent re-renders when the selected state is shallowly equal. However:
- `useRecords` selects `state.records` — since the array reference changes on every websocket update (see create-entity-store analysis), `useShallow` does a shallow array comparison. If the array contents (record references) change, it re-renders.
- `useRecordsMap` selects `state.recordsMap` — same issue, Map reference changes every time.
- `useActions` selects function references — these are stable since they come from the store creator closure. `useShallow` here is **unnecessary overhead** (comparing function refs that never change).

## Store Subscriptions
Delegates to `createEntityStore`.

## Potential Issues
- **`useShallow` on `useActions` is unnecessary** — the action functions (`loadAll`, `setRecords`, `getById`, `clear`) are stable references defined in the store creator. Using `useShallow` on them adds comparison cost with no benefit.
- **`useRecords` with `useShallow` does a shallow array comparison** on every store update, which is O(n) where n = number of records. For large collections (hundreds of submissions), this is noticeable.

## Recommendations
- Remove `useShallow` from `useActions` — use a direct selector or `useStore.getState()` for actions since they're stable.
- For `useRecords`, consider if `useShallow` is the right tool — if the goal is to skip re-renders when data hasn't changed, the fix should be upstream (in `create-entity-store` via diffing), not downstream via expensive shallow comparisons.

---
*Status*: Analyzed
