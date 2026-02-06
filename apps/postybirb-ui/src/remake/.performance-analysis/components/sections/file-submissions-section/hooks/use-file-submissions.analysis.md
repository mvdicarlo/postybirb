# Performance Analysis

**Source**: `components/sections/file-submissions-section/hooks/use-file-submissions.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/file-submissions-section/hooks/use-file-submissions.ts`

## Overview
Custom hook for file submissions (89 lines). Provides filtered, sorted, and drag-reordered file submissions.

## Memoization Usage
- [x] useMemo — `filteredSubmissions` (filters by search, type, status) ✅

## Re-render Triggers
- `useSubmissionsByType(FILE)` — all file submissions.
- `useFileSubmissionsFilter()` — search/type/status filters.
- `useState` for `orderedSubmissions`.
- `useEffect` syncs `orderedSubmissions` with `allSubmissions`.

## Store Subscriptions
- Submission entity store (FILE type only).
- File submissions UI store (filter state).

## Potential Issues
- **⚠️ MEDIUM: useEffect syncs `orderedSubmissions` with `allSubmissions`** — when submissions change, there's one render with stale order followed by another with updated order (double render).
- **`isDragEnabled` is `!searchQuery && !selectedType`** — computed inline on every render, cheap.
- **`orderedSubmissions` state duplicates store data** — creates a second copy of the array for drag reordering. Necessary pattern but increases memory usage.

## Recommendations
- Consider using `useRef` + forced update pattern instead of useState for orderedSubmissions to avoid double render.
- The optimistic ordering pattern is a known trade-off for drag-and-drop UX.

---
*Status*: Analyzed
