# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/archived-submission-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/archived-submission-card.tsx`

## Overview
Archived submission card (~200 lines). Read-only title, unarchive/delete/history actions. Uses context for selection.

## Memoization Usage
- [x] useMemo — `cardClassName` ✅
- [x] useCallback — `handleClick`, `handleKeyDown`, `handleUnarchive`, `handleDelete`, `handleViewHistory` ✅

## Re-render Triggers
- `useSubmissionsContext()` — `onSelect`.
- `useLocale()` — formatRelativeTime, formatDateTime.
- Props: `submission`, `submissionType`, `isSelected`, `isCompact`, `className`, `onViewHistory`.

## Store Subscriptions
- Submissions context.

## Potential Issues
- **Not wrapped in React.memo** — same issue as SubmissionCard; re-renders on any context change.
- **Direct API calls** (`submissionApi.unarchive`, `submissionApi.remove`) inside callbacks — fine, but error handling is simple.

## Recommendations
- Wrap in `React.memo`.

---
*Status*: Analyzed
