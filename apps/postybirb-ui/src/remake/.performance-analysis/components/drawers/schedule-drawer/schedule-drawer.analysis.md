# Performance Analysis

**Source**: `components/drawers/schedule-drawer/schedule-drawer.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/drawers/schedule-drawer/schedule-drawer.tsx`

## Overview
Schedule drawer wrapper. Simple component rendering `SectionDrawer` with full-width layout containing `SubmissionList` sidebar and `ScheduleCalendar`.

## Memoization Usage
- [ ] useMemo — not used
- [ ] useCallback — not used
- [ ] React.memo — not used

## Re-render Triggers
- `useActiveDrawer()` — re-renders on any drawer change.
- `useDrawerActions()` — stable.

## Store Subscriptions
- Drawer UI store.

## Potential Issues
None — thin wrapper. Performance concerns are in `ScheduleCalendar` and `SubmissionList`.

## Recommendations
None.

---
*Status*: Analyzed
