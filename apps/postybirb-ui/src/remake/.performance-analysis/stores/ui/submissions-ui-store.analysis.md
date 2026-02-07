# Performance Analysis

**Source**: `stores/ui/submissions-ui-store.ts`
**Full Path**: `apps/postybirb-ui/src/remake/stores/ui/submissions-ui-store.ts`

## Overview
Submissions UI state store with localStorage persistence. Manages filters (file/message), search queries, sidenav collapsed state, sub-nav visibility, and multi-edit preference.

## Memoization Usage
- [x] useShallow — in `useFileSubmissionsFilter`, `useMessageSubmissionsFilter`, `useSubmissionsFilter`, `useSubNavVisible`, `useSubmissionsContentPreferences`

## Re-render Triggers
- **`useSidenavCollapsed`**: single boolean — clean. ✅
- **`useToggleSidenav`**: single function ref — clean. ✅
- **`useFileSubmissionsFilter`**: `useShallow` bundles filter + searchQuery + setters. Re-renders when either filter or search query changes, even if only one changed.
- **`useSubmissionsFilter(type)`**: creates conditional selector based on `SubmissionType` — `useShallow` on the result object. Re-renders when any filter/query for that type changes.

## Store Subscriptions
None from websocket. Persists to localStorage.

## Potential Issues
- **`useSubmissionsFilter` creates a new object shape based on `type` parameter** inside `useShallow` — the conditional (ternary) inside the selector means Zustand evaluates both branches' shapes. `useShallow` still works correctly but the selector function itself is recreated if `type` changes (which is fine since the store hook handles this).
- Minor: localStorage writes on every search query keystroke (debouncing would help).

## Recommendations
- ~~Consider not persisting `searchQuery` fields to localStorage (they should reset between sessions).~~ **Done** — `partialize` now excludes `fileSubmissionsSearchQuery` and `messageSubmissionsSearchQuery`.
- Low priority overall.

---
*Status*: Analyzed
