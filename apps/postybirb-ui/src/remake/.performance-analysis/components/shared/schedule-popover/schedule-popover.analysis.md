# Performance Analysis

**Source**: `components/shared/schedule-popover/schedule-popover.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/schedule-popover/schedule-popover.tsx`

## Overview
Popover for editing submission schedule (398 lines). Three modes via SegmentedControl: None, Once (date/time pickers), Recurring (CronPicker). Maintains internal state that syncs back to props on close.

## Memoization Usage
- [x] useCallback — `handleClose`, `handleScheduleTypeChange`, `handleDateChange`, `handleCronChange`, `handleTimezoneChange` ✅

## Re-render Triggers
- `useState` for `internalSchedule` (local copy of schedule prop).
- `useLingui()` for localization.
- `useDisclosure()` for popover state.
- Prop changes: `schedule`, `onChange`.

## Store Subscriptions
None — pure prop-driven.

## Potential Issues
- **⚠️ `getScheduleDisplay()` not memoized** — called in the render for the Popover trigger button text. Creates new Intl.DateTimeFormat and runs cronstrue parsing on every render.
- **⚠️ Reference comparison in `handleClose`** — `if (internalSchedule !== schedule)` compares object references, not deep equality. Since `internalSchedule` is always a new state object, this will always be `true`, causing `onChange` to fire on every close even without changes.
- **`useLocalStorage` for last date** — reads/writes localStorage per render. Minor.

## Recommendations
- **Use deep comparison** (`JSON.stringify` or a deep equal utility) in `handleClose`.
- **Memoize `getScheduleDisplay`** with `useMemo`.
- Medium priority — this is used per submission and the popover trigger text re-computes on every parent re-render.

---
*Status*: Analyzed
