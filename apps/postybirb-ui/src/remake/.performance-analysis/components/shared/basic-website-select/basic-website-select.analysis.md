# Performance Analysis

**Source**: `components/shared/basic-website-select/basic-website-select.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/basic-website-select/basic-website-select.tsx`

## Overview
MultiSelect dropdown for selecting accounts, grouped by website. Provides `[WebsiteName] AccountName` format labels. Used for target website selection.

## Memoization Usage
- [x] useMemo — `accountsByWebsite` Map ✅
- [x] useMemo — `options` ComboboxItemGroup[] (grouped, sorted) ✅
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useAccounts()` — re-renders on ANY account store update.
- `useState` for `value` — local controlled value.
- `useEffect` syncs `value` with `selected` prop — re-renders when prop changes.

## Store Subscriptions
- Account entity store (via `useAccounts`).

## Potential Issues
- **`mapRecordToDto` defined inline in component body** — creates a new function reference every render. Minor since it's only called in `onChange`.
- **`useEffect` syncs `selected` prop to local `value` state** — causes an extra render when `selected` prop changes (prop change → render → useEffect → setValue → render again). Consider using `selected` directly instead of local state mirroring.
- **`onChange` handler creates new array on every call** — `accounts.filter(a => newValue.includes(a.id)).map(mapRecordToDto)` — O(N×M) where N = all accounts and M = selected. Fine for typical account counts.

## Recommendations
- Remove the local `value` state + `useEffect` sync and use `selected` directly as the controlled value. Eliminates the double-render.
- Move `mapRecordToDto` outside the component or wrap in `useCallback`.

---
*Status*: Analyzed
