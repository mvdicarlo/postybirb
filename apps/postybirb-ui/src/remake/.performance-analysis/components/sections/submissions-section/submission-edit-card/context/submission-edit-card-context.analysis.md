# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/context/submission-edit-card-context.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/context/submission-edit-card-context.tsx`

## Overview
Context provider for individual submission edit cards (~90 lines). Each card gets its own context with submission, config flags, and target IDs.

## Memoization Usage
- [x] useMemo — context value object ✅

## Re-render Triggers
- Props: `submission`, `isCollapsible`, `defaultExpanded`, `targetSubmissionIds`.
- `useMemo` deps: `[submission, isCollapsible, defaultExpanded, targetSubmissionIds]`.

## Store Subscriptions
None — data-only context.

## Potential Issues
- **`submission` in useMemo deps** — since `submission` is a SubmissionRecord object, if the parent creates a new reference on every render, useMemo won't help. Depends on parent's memoization.
- **`targetSubmissionIds` is an array** — new array reference from parent breaks useMemo.

## Recommendations
- Parent should memoize `targetSubmissionIds` array.
- Overall well-structured — data-only context with no actions avoids the SubmissionsContext antipattern.

---
*Status*: Analyzed
