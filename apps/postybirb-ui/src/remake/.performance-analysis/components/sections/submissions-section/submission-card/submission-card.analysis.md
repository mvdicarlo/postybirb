# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-card.tsx`

## Overview
Main submission card component (~200 lines). Shows thumbnail, editable title, status badges, schedule info, action buttons, and quick-edit controls. Used in virtualized list.

## Memoization Usage
- [x] useCallback — `handleKeyDown`, `handleCheckboxClick` ✅
- [x] useMemo — `mostRecentPostHasErrors` (sorts posts), `cardClassName` (cn utility) ✅

## Re-render Triggers
- `useSubmissionsContext()` — `onSelect` function.
- `useLocale()` — formatRelativeTime, formatDateTime.
- `useSubmissionActions(submission.id)` — all bound actions (depends on context).
- Props: `submission`, `isSelected`, `draggable`, `isCompact`, `className`, `dragHandleListeners`.

## Store Subscriptions
- Submissions context (via `useSubmissionsContext` and `useSubmissionActions`).

## Potential Issues
- **⚠️ HIGH: Not wrapped in React.memo** — every context change (selection, any handler ref change) re-renders ALL mounted cards. In a list of 50 submissions, this means 50 card re-renders on every click.
- **`useSubmissionActions` recreates bound handlers when context changes** — cascading from the context instability issue.
- **`mostRecentPostHasErrors` copies and sorts `submission.posts` array** — `[...submission.posts].sort()` creates a copy per render. Should be on the Record class.
- **`getThumbnailUrl(submission)` called inline** — runs every render, though it's cheap.

## Recommendations
- **Wrap in `React.memo`** — critical for list performance.
- Move `mostRecentPostHasErrors` to `SubmissionRecord` class as a getter.
- Split context so selection data doesn't cause action handler instability.

---
*Status*: Analyzed
