# Performance Analysis

**Source**: `components/dialogs/settings-dialog/settings-dialog.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/dialogs/settings-dialog/settings-dialog.tsx`

## Overview
Settings dialog with sidebar navigation (208 lines). Uses Mantine `Modal` with a two-panel layout: nav sidebar with section links, and a content area rendering the active section component. Opens when `activeDrawer === 'settings'`.

## Memoization Usage
- [ ] useMemo — not used
- [x] useCallback — `renderSection` memoized on `[activeSection]` — returns the correct section component based on active tab.
- [ ] React.memo — not used

## Re-render Triggers
- `useActiveDrawer()` — re-renders when any drawer opens/closes.
- `useDrawerActions()` — `useShallow` on actions (stable refs). Shouldn't cause re-renders.
- `useState` for `activeSection` — local state.

## Store Subscriptions
- Drawer UI store (via `useActiveDrawer`, `useDrawerActions`).

## Potential Issues
- **`useCallback` on `renderSection` is unnecessary** — it wraps a switch statement that returns JSX. Since the result is used inline as `{renderSection()}`, the `useCallback` prevents re-creating the function reference but doesn't prevent re-execution. The JSX is always recreated when called. The `useCallback` here adds complexity without benefit — a plain function or direct inline JSX would be clearer.
- **`NAV_ITEMS.find()` in the header breadcrumb** — runs on every render to find the active section label. O(8) lookup — negligible.
- **`NAV_ITEMS` is module-level with JSX** — `<Trans>` and icon components. Stable references. ✅
- **`useActiveDrawer` causes re-render when ANY drawer changes** — even non-settings drawers. This component checks `opened = activeDrawer === 'settings'` and passes it to Modal. When another drawer opens, this component re-renders only to pass `opened={false}` to Modal.

## Recommendations
- Remove `useCallback` from `renderSection` — it doesn't provide a perf benefit here since the function is called immediately, not passed as a prop to a memoized child.
- ~~Could conditionally render the entire dialog content only when `opened` is true, to avoid rendering the nav/content when the modal is closed.~~ **Done** — early return with empty `<Modal opened={false} />` when not settings drawer; skips all sidebar nav, section rendering, and breadcrumb computation.

---
*Status*: Analyzed
