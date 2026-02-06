# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-handlers.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-handlers.ts`

## Overview
Composition hook (~100 lines). Combines `useSubmissionCreate`, `useSubmissionDelete`, `useSubmissionPost`, and `useSubmissionUpdate` into a single handlers interface.

## Memoization Usage
Delegates to composed hooks — each sub-hook uses `useCallback` internally.

## Re-render Triggers
- All triggers from the 4 composed hooks combined.
- Key instabilities: `viewState` and `selectedIds` props flow into `useSubmissionDelete` and `useSubmissionPost`.

## Store Subscriptions
Indirect via composed hooks:
- Navigation store (via delete, post, update hooks).
- Submission store (via post hook for `submissionsMap`).

## Potential Issues
- **Aggregation amplifies instability** — any change in `viewState`, `selectedIds`, or `submissionsMap` recreates at least one handler, which propagates to `SubmissionsProvider` context.

## Recommendations
- Make individual handlers stable by reading state at call time (`getState()`).

---
*Status*: Analyzed
