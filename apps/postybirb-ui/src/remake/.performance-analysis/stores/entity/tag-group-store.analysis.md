# Performance Analysis

**Source**: `stores/entity/tag-group-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/tag-group-store.ts`

## Overview
Tag group entity store using `createTypedStore`. Has an **additional manual websocket subscription** outside of `createEntityStore` for `TAG_GROUP_UPDATES`, plus `useNonEmptyTagGroups` filter hook.

## Memoization Usage
- [x] useShallow — via `createTypedStore` + in `useNonEmptyTagGroups`

## Re-render Triggers
Standard entity store pattern.

## Store Subscriptions
- **⚠️ Does NOT use `websocketEvent` option in `createTypedStore`** — instead manually subscribes to `TAG_GROUP_UPDATES` via `AppSocket.on()`. This is different from other typed stores.

## Potential Issues
- **Manual websocket handler creates records and calls `setRecords`** — this is fine functionally, but it's inconsistent with the pattern used by `createEntityStore`'s built-in websocket handling. The manual handler bypasses any future improvements to the factory's websocket handling.
- No `websocketEvent` passed to config, so the store doesn't get the built-in handler — good (no duplicate), but surprising.

## Recommendations
- Consider using the `websocketEvent` option for consistency, or document why this store handles it manually.
- Low priority — tag groups change rarely.

---
*Status*: Analyzed
