# Performance Analysis

**Source**: `components/drawers/schedule-drawer/schedule-calendar.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/schedule-drawer/schedule-calendar.tsx`

## Overview
FullCalendar integration for schedule visualization (370 lines). Shows scheduled submissions as calendar events with drag-drop rescheduling, external drop support, and click-to-manage modal. Computes recurring events from cron expressions.

## Memoization Usage
- [x] useMemo — `scheduledSubmissions` (filtered from all submissions) ✅
- [x] useMemo — `events` (FullCalendar event objects derived from scheduled submissions) ✅
- [x] useCallback — `handleEventDrop`, `handleExternalDrop`, `handleEventClick` ✅

## Re-render Triggers
- **`useSubmissions()`** — subscribes to submission entity store. **Re-renders on EVERY submission update** (no `useShallow` on this hook).
- `useLocale()` — re-renders on locale changes.
- `useState` for `selectedEvent`, `modalOpened` — local state.

## Store Subscriptions
- Submission entity store (via `useSubmissions` — no `useShallow`).

## Potential Issues
- **⚠️ CRITICAL: `useSubmissions()` causes re-render on EVERY submission store update** — since `useSubmissions` doesn't use `useShallow`, ANY submission change (editing title, adding file, validation update) re-renders this component. Each re-render recomputes `scheduledSubmissions` filter and `events` transformation.
- **⚠️ `events` useMemo does `Cron(submission.schedule.cron).nextRuns(4)` for every recurring submission on every recompute** — Cron parsing + next 4 runs is moderately expensive. With 10 recurring submissions, that's 10 cron parse + 40 date calculations.
- **`moment(...)` called for every event's `start` date** — creates moment objects inside useMemo. Not expensive individually but adds up.
- **`handleUnschedule` and `toggleScheduledState` not memoized** — recreated every render. Minor since they're button click handlers.
- **FullCalendar re-renders when `events` array reference changes** — even if events are identical, a new array reference causes FullCalendar to re-process all events.

## Recommendations
- ✅ **Done**: Created `useSubmissionsWithSchedule()` targeted selector in submission-store. ScheduleCalendar now subscribes only to scheduled submissions, avoiding re-renders from unrelated submission changes. Removed redundant inline filter `useMemo`.
- **Cron parsing** — already inside a `useMemo` keyed on `scheduledSubmissions` (which is now stable via targeted selector). No further caching needed.
- High priority — FullCalendar is a heavy library and unnecessary re-renders are costly.

---
*Status*: ✅ Optimized
