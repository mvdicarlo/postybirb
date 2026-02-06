# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-actions.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-actions.tsx`

## Overview
Action buttons and dropdown menu for submissions (~200 lines). Schedule popover, post/cancel button, more menu with edit/duplicate/history/archive/delete.

## Memoization Usage
- [x] useCallback — `handleEdit`, `handleDuplicate`, `handleDelete`, `handleViewHistory`, `handleArchive`, `handleCancel`, `handleScheduleChange` ✅ (all wrap `e.stopPropagation()` + delegate)

## Re-render Triggers
- Props: `canPost`, `schedule`, `isScheduled`, `isQueued`, `hasHistory`, and all 7 handler props.

## Store Subscriptions
None — pure prop-driven.

## Potential Issues
- **7 handler props from parent** — if parent (SubmissionCard) doesn't memoize handlers, this re-renders. Handlers come from `useSubmissionActions` which depends on unstable context.
- **Menu with `withinPortal`** — renders menu dropdown in portal, good for performance.

## Recommendations
- Wrap in `React.memo` — receives many props but most are stable.

---
*Status*: Analyzed
