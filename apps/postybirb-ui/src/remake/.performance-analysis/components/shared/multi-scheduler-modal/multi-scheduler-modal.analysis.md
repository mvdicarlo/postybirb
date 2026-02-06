# Performance Analysis

**Source**: `components/shared/multi-scheduler-modal/multi-scheduler-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/multi-scheduler-modal/multi-scheduler-modal.tsx`

## Overview
Modal for scheduling multiple submissions at once (308 lines). Two-column layout with reorderable submission list (left) and schedule form with date picker + interval inputs (right). Uses `Promise.all` to apply schedules.

## Memoization Usage
- [x] useMemo — resets `orderedSubmissions` when `initialSubmissions` changes (but see issues below)
- [x] useCallback — `handleDateChange`, `renderSchedulePreview`, `handleApply` ✅

## Re-render Triggers
- Props: `opened`, `onClose`, `submissions`.
- `useState` for `selectedDate`, `days`, `hours`, `minutes`, `onlySetDate`, `isSubmitting`, `orderedSubmissions`.
- `useLingui()`, `useLocale()` — locale changes.

## Store Subscriptions
None directly — receives submissions as props.

## Potential Issues
- **⚠️ `useMemo` used as `useEffect` replacement** — `useMemo(() => { setOrderedSubmissions(initialSubmissions); }, [initialSubmissions])` — this is an anti-pattern. `useMemo` should not have side effects. Should be `useEffect`.
- **`handleApply` fires `Promise.all` for all submissions** — with 50 submissions, that's 50 simultaneous API calls.
- **`useLocalStorage` for last schedule date** — reads/writes localStorage on every render. Fine for a modal.

## Recommendations
- **Replace the `useMemo` with `useEffect`** for syncing `orderedSubmissions`.
- Consider batching the schedule API calls.

---
*Status*: Analyzed
