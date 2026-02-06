# Performance Analysis

**Source**: `stores/entity/directory-watcher-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/directory-watcher-store.ts`

## Overview
Directory watcher entity store using `createTypedStore`. Adds `useActiveDirectoryWatchers` (filters watchers with valid paths).

## Memoization Usage
- [x] useShallow — via `createTypedStore` + in `useActiveDirectoryWatchers`

## Re-render Triggers
Standard entity store pattern.

## Store Subscriptions
- Subscribes to `DIRECTORY_WATCHER_UPDATES`.

## Potential Issues
- Same systemic issues, but very low impact — directory watchers change rarely and are few in number.

## Recommendations
None — low priority.

---
*Status*: Analyzed
