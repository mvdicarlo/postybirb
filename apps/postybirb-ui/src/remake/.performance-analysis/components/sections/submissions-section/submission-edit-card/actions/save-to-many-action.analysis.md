# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/actions/save-to-many-action.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/actions/save-to-many-action.tsx`

## Overview
Action button to apply multi-submission settings to multiple targets (~55 lines). Opens SubmissionPickerModal.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`, `targetSubmissionIds`.
- `useState` for `modalOpened`.

## Store Subscriptions
None.

## Potential Issues
None — simple modal trigger.

## Recommendations
None.

---
*Status*: Analyzed
