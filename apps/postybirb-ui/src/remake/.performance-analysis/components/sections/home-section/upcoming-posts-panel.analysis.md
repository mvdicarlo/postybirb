# Performance Analysis

**Source**: `components/sections/home-section/upcoming-posts-panel.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/upcoming-posts-panel.tsx`

## Overview
Upcoming posts panel (126 lines). Shows next 5 scheduled submissions with relative times. Clickable to navigate to submission.

## Memoization Usage
- [x] useCallback — `handleNavigateToSubmission` ✅
- [x] useMemo — `upcomingPosts` (filters future, sorts, slices) ✅

## Re-render Triggers
- `useScheduledSubmissions()` — scheduled submissions.
- `useLocale()` — formatRelativeTime, formatDateTime.
- `useViewStateActions()` — setViewState.
- `useLingui()` — locale.

## Store Subscriptions
- Submission entity store (scheduled only).
- Navigation store (actions).

## Potential Issues
- **`new Date()` inside `useMemo`** — the `now` variable is captured at memo creation time. If submissions change but time passes, the filter may be stale. Acceptable since it recomputes on any scheduled submission change.

## Recommendations
- Wrap in `React.memo`.

---
*Status*: Analyzed
