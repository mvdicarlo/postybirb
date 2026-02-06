# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submissions.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submissions.ts`

## Overview
Hook for filtering, searching, and ordering submissions (89 lines). Returns all, filtered, and ordered submissions with drag-enabled state.

## Memoization Usage
- [x] useMemo — `filteredSubmissions` (filter + search + sort) ✅

## Re-render Triggers
- `useSubmissionsByType(submissionType)` — all submissions of type.
- `useSubmissionsFilter(submissionType)` — filter, searchQuery.
- `useState` for `orderedSubmissions`.
- `useEffect` syncs orderedSubmissions with filteredSubmissions.

## Store Subscriptions
- Submission entity store (by type).
- Submissions UI store (filter/search).

## Potential Issues
- **⚠️ MEDIUM: `useEffect` double-render pattern** — when `filteredSubmissions` changes, there's one render with stale `orderedSubmissions` followed by a setState that triggers a second render. Same pattern as `useFileSubmissions`.
- **`filteredSubmissions` useMemo runs a sort on every change** — Array.sort is in-place but on a new filtered array, so acceptable.

## Recommendations
- Consider `useRef` + forceUpdate or `useSyncExternalStore` pattern to eliminate the double render.

---
*Status*: Analyzed
