# Performance Analysis

**Source**: `components/sections/home-section/home-content.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/home-section/home-content.tsx`

## Overview
Main dashboard content (153 lines). Shows welcome state for new users, or dashboard with stat cards, queue control, calendar, activity, upcoming posts, validation issues, and account health panels.

## Memoization Usage
None.

## Re-render Triggers
- `useViewStateActions()` — setViewState action.
- `useDrawerActions()` — openDrawer action.
- `useRegularSubmissions()` — all non-template/non-archived submissions.
- `useAccounts()` — all accounts.
- `useSubmissionsByType(FILE)` — file submissions.
- `useSubmissionsByType(MESSAGE)` — message submissions.
- `useQueuedSubmissions()` — queued submissions.
- `useScheduledSubmissions()` — scheduled submissions.

## Store Subscriptions
- Account entity store (all).
- Submission entity store (multiple selectors: regular, by-type×2, queued, scheduled).
- Navigation store (actions).
- Drawer store (actions).

## Potential Issues
- **⚠️ HIGH: 6 store subscriptions** — any account or submission change re-renders this entire dashboard. Creating/editing/scheduling any submission triggers re-render of all dashboard panels.
- **`fileCount` and `messageCount` computed inline** — `.filter(s => !s.isTemplate).length` runs on every render. Should be memoized.
- **All child panels are rendered unconditionally** — no lazy loading or virtualization for panels below the fold.

## Recommendations
- **Memoize `fileCount` and `messageCount`** with `useMemo`.
- **Wrap child panels in `React.memo`** so they don't re-render when sibling data changes.
- Consider splitting store subscriptions into child components so each panel subscribes only to what it needs (panels already do this, but HomeContent also subscribes to everything).
- High priority — this is the home screen and re-renders very frequently.

---
*Status*: Analyzed
