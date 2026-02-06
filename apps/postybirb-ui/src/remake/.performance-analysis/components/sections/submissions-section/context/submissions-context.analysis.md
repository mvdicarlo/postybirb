# Performance Analysis

**Source**: `components/sections/submissions-section/context/submissions-context.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/context/submissions-context.tsx`

## Overview
Context provider for submission data and actions (~140 lines). Provides submissionType, selectedIds, isDragEnabled, and 10 action handlers to descendant components.

## Memoization Usage
- [x] useMemo — context value object, keyed on all 13 props ✅

## Re-render Triggers
- Any of the 13 dependency props changing.

## Store Subscriptions
None directly — receives data via props.

## Potential Issues
- **⚠️ HIGH: `selectedIds` changes on every selection** — this is included in the `useMemo` deps, so the context value is recreated on every selection change, causing ALL context consumers (every submission card) to re-render.
- **Action handlers from parent may be unstable** — `onSelect`, `onDelete`, `onEdit`, `onPost` etc. come from `useSubmissionHandlers` and `useSubmissionSelection`, several of which have `viewState` in their deps.

## Recommendations
- **Split into two contexts**: `SubmissionsDataContext` (selectedIds, isDragEnabled, submissionType) and `SubmissionsActionsContext` (all 10 action handlers). Actions are mostly stable; data changes often.
- This is the #1 architectural improvement for submissions section performance.

---
*Status*: Analyzed
