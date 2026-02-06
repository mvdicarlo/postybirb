# Performance Analysis

**Source**: `stores/entity/user-converter-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/user-converter-store.ts`

## Overview
User converter entity store using `createTypedStore`. Like tag-group-store, has a **manual websocket subscription** outside `createEntityStore`.

## Memoization Usage
- [x] useShallow — via `createTypedStore`

## Re-render Triggers
Standard entity store pattern.

## Store Subscriptions
- Manual `AppSocket.on(USER_CONVERTER_UPDATES, ...)` — same pattern as tag-group-store.
- No `websocketEvent` in config.

## Potential Issues
Same as tag-group-store — inconsistent websocket handling pattern.

## Recommendations
Same as tag-group-store. Low priority.

---
*Status*: Analyzed
