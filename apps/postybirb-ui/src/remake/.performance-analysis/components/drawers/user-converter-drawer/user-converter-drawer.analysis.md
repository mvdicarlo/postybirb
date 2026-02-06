# Performance Analysis

**Source**: `components/drawers/user-converter-drawer/user-converter-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/user-converter-drawer/user-converter-drawer.tsx`

## Overview
User converter drawer. Thin wrapper that creates a user-specific `config` object and passes it to the generic `ConverterDrawer` component. Nearly identical structure to `TagConverterDrawer`.

## Memoization Usage
- [x] useMemo — `config` object memoized with empty deps `[]` ✅

## Re-render Triggers
- `useActiveDrawer()` — re-renders on any drawer change.
- `useUserConverters()` — re-renders on user converter store updates.
- `useDrawerActions()` — stable actions.

## Store Subscriptions
- Drawer UI store.
- User converter entity store.

## Potential Issues
- Same as TagConverterDrawer — `t()` calls in useMemo with `[]` deps won't update on locale change.

## Recommendations
- Same as TagConverterDrawer.

---
*Status*: Analyzed
