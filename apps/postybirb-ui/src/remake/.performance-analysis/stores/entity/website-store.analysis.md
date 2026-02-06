# Performance Analysis

**Source**: `stores/entity/website-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/website-store.ts`

## Overview
Website entity store. Uses `create()` directly (NOT `createEntityStore` or `createTypedStore`) — fully custom implementation. Manages `websites` array and `websitesMap`. Subscribes to `WEBSITE_UPDATES` in the store creator. Provides `useFileWebsites` and `useMessageWebsites` filter hooks.

## Memoization Usage
- [x] useShallow — in `useWebsitesLoading`, `useFileWebsites`, `useMessageWebsites`, `useWebsiteActions`

## Re-render Triggers
- **`useWebsites`**: no `useShallow` — re-renders on every store update.
- **`useWebsitesMap`**: no `useShallow` — re-renders on every store update.
- **`useWebsite(id)`**: returns `websitesMap.get(id)` — new reference on every update.
- Filter hooks use `useShallow` for stable output.

## Store Subscriptions
- Manual websocket subscription in the store creator.

## Potential Issues
- **Doesn't use `createEntityStore` pattern** — uses different field names (`websites` vs `records`), different interface. The `store-init.ts` and barrel export work around this with custom integration.
- **Same full-replacement problem** — websocket handler rebuilds all records on every event.
- **`useWebsites` and `useWebsitesMap` missing `useShallow`** — frequent re-renders for subscribers.

## Recommendations
- Consider refactoring to use `createEntityStore` for consistency.
- Add `useShallow` to `useWebsites` and `useWebsitesMap`.
- Website data changes infrequently (mainly login status changes), so practical impact is moderate.

---
*Status*: Analyzed
