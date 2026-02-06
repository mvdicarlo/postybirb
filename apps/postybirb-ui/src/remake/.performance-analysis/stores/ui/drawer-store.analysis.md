# Performance Analysis

**Source**: `stores/ui/drawer-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/drawer-store.ts`

## Overview
Drawer state store (no persistence). Manages which drawer is open (only one at a time). Simple `activeDrawer: DrawerKey | null` state.

## Memoization Usage
- [x] useShallow — in `useDrawerActions`

## Re-render Triggers
- **`useActiveDrawer`**: single value selector — clean. ✅
- **`useIsDrawerOpen(drawer)`**: derived boolean — clean. ✅
- **`useDrawerActions`**: `useShallow` on 3 function refs that are stable. `useShallow` is unnecessary here since function references from Zustand's `set` parameter are stable.

## Store Subscriptions
None.

## Potential Issues
- **`useDrawerActions` with `useShallow` is unnecessary overhead** — the three action functions are stable references. Direct selection without `useShallow` would be more efficient.

## Recommendations
- Remove `useShallow` from `useDrawerActions` — select actions directly.
- Very low priority.

---
*Status*: Analyzed
