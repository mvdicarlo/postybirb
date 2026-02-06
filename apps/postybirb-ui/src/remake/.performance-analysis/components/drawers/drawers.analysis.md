# Performance Analysis

**Source**: `components/drawers/drawers.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/drawers.tsx`

## Overview
Drawer orchestration file. Re-exports all drawer components and wraps `CustomShortcutsDrawer` with store connection (useActiveDrawer/useDrawerActions). Other drawers manage their own store connections internally.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useActiveDrawer()` — re-renders the `CustomShortcutsDrawer` wrapper when any drawer opens/closes.
- `useDrawerActions()` — `useShallow` on actions (stable).

## Store Subscriptions
- Drawer UI store (in the `CustomShortcutsDrawer` wrapper function).

## Potential Issues
- **`CustomShortcutsDrawer` wrapper re-renders on any drawer change** — `useActiveDrawer` returns the current active drawer key. When any drawer changes (not just customShortcuts), this wrapper re-renders to check if `opened` should be true/false.

## Recommendations
- Could use a more targeted selector like `useIsDrawerOpen('customShortcuts')` to only re-render when that specific drawer's state changes.
- Low priority — drawer state changes are infrequent (user-initiated).

---
*Status*: Analyzed
