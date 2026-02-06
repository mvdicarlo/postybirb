# Performance Analysis

**Source**: `stores/entity/custom-shortcut-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/entity/custom-shortcut-store.ts`

## Overview
Custom shortcut entity store using `createTypedStore`. Exports standard hooks plus a `customShortcutStoreRef` for access outside React (used by BlockNote inline content specs).

## Memoization Usage
- [x] useShallow — via `createTypedStore` generated hooks

## Re-render Triggers
Same pattern as all `createTypedStore` stores — all generated hooks re-evaluate on every websocket update.

## Store Subscriptions
- Subscribes to `CUSTOM_SHORTCUT_UPDATES` via `createEntityStore`.

## Potential Issues
- Same systemic issues as `create-entity-store` (full replacement on every update).
- `customShortcutStoreRef` exposes store for non-React access — fine, but consumers need to call `.getState()` and won't get reactive updates.

## Recommendations
- Low priority — custom shortcuts change infrequently. The systemic store issues are less impactful here.

---
*Status*: Analyzed
