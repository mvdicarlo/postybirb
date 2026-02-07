# Performance Analysis

**Source**: `hooks/tag-search/use-tag-search.ts`
**Full Path**: `apps/postybirb-ui/src/remake/hooks/tag-search/use-tag-search.ts`

## Overview
Hook for debounced tag searching. Uses `useDebouncedCallback` (300ms) to search via the active `TagSearchProvider`. Tracks loading state and uses a request ID ref for stale request handling.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used (uses `useDebouncedCallback` from Mantine instead)

## Re-render Triggers
- **`useSettings()`** — subscribes to entire settings record. Re-renders when ANY setting changes, not just tag search settings.
- **`useTagSearchProvider()`** — subscribes to a specific setting. Re-renders when tag search provider setting changes.
- **`useState` for `data`, `searchValue`, `isLoading`** — local state, re-renders on search interaction.
- **`useEffect` on `[searchValue, debouncedSearch]`** — runs on every search value change.

## Store Subscriptions
- Settings store (via `useSettings` and `useTagSearchProvider`)

## Potential Issues
- ~~**`useSettings()` subscribes to the full settings record** — this hook only needs `tagSearchProvider`, but it subscribes to `useSettings()` which re-evaluates on any settings change. The `useTagSearchProvider()` hook already provides this — `useSettings()` may be unused.~~ **Fixed** — removed unused `useSettings()` subscription.
- **`useEffect` cleanup sets `requestId.current = -1`** — this correctly prevents stale updates, but note that the effect runs on every `searchValue` change, not just unmount. The cleanup of the previous effect sets requestId to -1, but the new effect immediately increments it in `debouncedSearch`. This works but is subtle.

## Recommendations
- ~~Remove `useSettings()` if it's not used — it causes unnecessary re-renders. Only `useTagSearchProvider()` is needed.~~ **Done.**
- Otherwise well-structured for a debounced search hook.

---
*Status*: Analyzed
