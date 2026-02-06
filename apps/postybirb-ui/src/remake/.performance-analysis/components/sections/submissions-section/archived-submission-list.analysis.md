# Performance Analysis

**Source**: `components/sections/submissions-section/archived-submission-list.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/archived-submission-list.tsx`

## Overview
Archived submissions list (~85 lines). Non-virtualized ScrollArea list with search filtering and history drawer.

## Memoization Usage
- [x] useMemo — `filteredSubmissions` (filter by type, search, sort by modified) ✅

## Re-render Triggers
- `useSubmissionsContext()` — selectedIds.
- `useSubmissionsFilter(submissionType)` — searchQuery.
- `useDebouncedValue(searchQuery, 300)` — debounced search.
- `useArchivedSubmissions()` — all archived submissions.
- `useIsCompactView()` — compact view.
- `useState` for `historySubmission`.

## Store Subscriptions
- Submission entity store (archived).
- Submissions context (data).
- Submissions UI store (filter).
- Appearance store (compact).

## Potential Issues
- **Not virtualized** — renders all archived submissions. May be slow with many archived items.
- **`handleViewHistory` not memoized** — creates inline closure per card. Minor.

## Recommendations
- Virtualize if archived count can be large.
- Wrap `ArchivedSubmissionCard` in `React.memo`.

---
*Status*: Analyzed
