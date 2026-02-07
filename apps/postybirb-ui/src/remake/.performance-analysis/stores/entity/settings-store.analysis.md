# Performance Analysis

**Source**: `stores/entity/settings-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/settings-store.ts`

## Overview
Settings entity store. Uses `createEntityStore` directly. The API returns an array but there's only ever ONE settings record. Provides fine-grained selectors: `useSettings`, `useSettingsOptions`, `useLanguage`, `useQueuePaused`, `useHiddenWebsites`, `useAllowAd`, `useDesktopNotifications`, `useTagSearchProvider`.

## Memoization Usage
- [ ] useShallow — **NOT used** in `useSettingsLoading` or `useSettingsActions` (creates new objects on every call)

## Re-render Triggers
- **Individual selectors** (`useLanguage`, `useQueuePaused`, etc.): These select primitive values or small objects from `records[0]`. They re-render when the settings record reference changes (every websocket update), but the return value is often the same primitive, so React bails out of re-rendering.
- **`useSettingsLoading`**: creates a new object on every call — missing `useShallow`, so every subscriber re-renders on every store update.
- **`useSettingsActions`**: same issue — creates new object without `useShallow`.

## Store Subscriptions
- Subscribes to `SETTINGS_UPDATES`.

## Potential Issues
- ~~**`useSettingsLoading` missing `useShallow`** — subscribers re-render unnecessarily.~~ **Fixed** — `useShallow` added.
- ~~**`useSettingsActions` missing `useShallow`** — same issue. Since actions are stable functions, this creates new wrapper objects for no reason.~~ **Fixed** — action hook now uses direct selector (no `useShallow` needed since action refs are stable).
- Settings changes are infrequent, so practical impact is low.

## Recommendations
- ~~Add `useShallow` to `useSettingsLoading` and `useSettingsActions`.~~ **Done.**
- Low priority due to infrequent updates.

---
*Status*: Analyzed
