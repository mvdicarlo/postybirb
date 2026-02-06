# Performance Analysis

**Source**: `components/sections/home-section/schedule-calendar-panel.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/schedule-calendar-panel.tsx`

## Overview
Mini month calendar panel (246 lines). Shows a grid of days with dots indicating scheduled submissions. Month navigation and locale-aware formatting.

## Memoization Usage
- [x] useMemo — `useWeekdays()` custom hook (keyed on `t`) ✅
- [x] useMemo — `scheduledDates` Map counting submissions per day ✅
- [x] useMemo — `days` grid cells ✅
- [x] useCallback — `formatMonth` ✅

## Re-render Triggers
- `useScheduledSubmissions()` — scheduled submissions store.
- `useDrawerActions()` — openDrawer action.
- `useLocale()` — locale.
- `useState` for `currentMonth`.

## Store Subscriptions
- Submission entity store (scheduled only).
- Drawer store (actions).

## Potential Issues
- **Calendar grid renders 35-42 Box elements per render** — each with conditional styling. This is a lot of DOM elements but they're simple boxes.
- **`today` is created as `new Date()` on every render** — `isSameDay` comparison works but creates a new Date per render. Minor.
- **`handlePrevMonth` / `handleNextMonth` / `handleOpenScheduleDrawer` not memoized** — inline functions, minor.

## Recommendations
- Wrap in `React.memo`.
- Consider memoizing navigation handlers with `useCallback`.
- Low priority — calendar is a relatively static panel.

---
*Status*: Analyzed
