# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-actions.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-actions.ts`

## Overview
Hook that returns bound action handlers for a specific submission (~95 lines). Uses context to bind all handlers to a specific submissionId.

## Memoization Usage
- [x] useMemo — entire bound actions object, keyed on [context, submissionId] ✅

## Re-render Triggers
- Context changes from `useSubmissionsContext()`.
- `submissionId` prop changes.

## Store Subscriptions
None directly — consumes SubmissionsContext.

## Potential Issues
- **⚠️ MEDIUM: Depends on `context` object reference** — if SubmissionsProvider value changes (e.g., selectedIds changes), all bound actions are recreated for every card using this hook. The actions themselves are stable, but the context value isn't.

## Recommendations
- Split SubmissionsContext into data context and actions context. This hook only needs actions, which are stable.

---
*Status*: Analyzed
