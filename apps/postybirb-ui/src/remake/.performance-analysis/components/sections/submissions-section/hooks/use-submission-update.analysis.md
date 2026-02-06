# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-update.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-update.ts`

## Overview
Hook for submission update handlers (~90 lines). Duplicate, archive, edit (select), default option changes, schedule changes.

## Memoization Usage
- [x] useCallback — `handleDuplicate` (stable, []), `handleArchive` (stable, []), `handleEdit` (deps: viewState, setViewState), `handleDefaultOptionChange` (stable, []), `handleScheduleChange` (stable, []) ✅

## Re-render Triggers
- `useNavigationStore` selector for `setViewState`.
- Prop: `viewState`.

## Store Subscriptions
- Navigation store (setViewState).

## Potential Issues
- **`handleEdit` depends on `viewState`** — recreated on every navigation change. Other handlers are stable.
- **`handleDefaultOptionChange` uses `useSubmissionStore.getState()`** — ✅ correctly reads state at call time instead of closing over it.

## Recommendations
- Make `handleEdit` stable by using `useNavigationStore.getState()` inside the callback.

---
*Status*: Analyzed
