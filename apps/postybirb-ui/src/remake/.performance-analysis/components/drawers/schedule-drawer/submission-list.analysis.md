# Performance Analysis

**Source**: `components/drawers/schedule-drawer/submission-list.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/schedule-drawer/submission-list.tsx`

## Overview
Draggable submission list for the schedule drawer (160 lines). Shows unscheduled submissions that can be dragged onto the FullCalendar. Uses FullCalendar's `Draggable` class for external drag-drop. Features search filtering.

## Memoization Usage
- [x] useMemo — `unscheduledSubmissions` (filter + search + sort, keyed on submissions and debouncedSearch) ✅
- [x] useDebouncedValue — 200ms search debounce ✅
- [ ] React.memo — **NOT used on `DraggableSubmissionItem`**

## Re-render Triggers
- **`useSubmissions()`** — re-renders on EVERY submission store update (no `useShallow`).
- `useLingui()` — re-renders on i18n changes.
- `useState` for `searchQuery` — local state.

## Store Subscriptions
- Submission entity store (via `useSubmissions`).

## Potential Issues
- **⚠️ Same `useSubmissions()` issue as ScheduleCalendar** — any submission change re-renders this component. The `unscheduledSubmissions` useMemo helps by only recomputing the filtered list, but if the submissions array reference changes (it always does), the memo recomputes.
- **`DraggableSubmissionItem` not memoized** — all items re-render when list re-renders. Minor since items are simple (icon + text).
- **FullCalendar `Draggable` initialized on mount with `[]` deps** — uses a `containerRef` that won't change. ✅

## Recommendations
- ✅ **Done**: Created `useUnscheduledSubmissions()` targeted selector in submission-store. SubmissionList now subscribes only to unscheduled submissions.
- `DraggableSubmissionItem` memoization is optional — items are lightweight.

---
*Status*: ✅ Optimized
