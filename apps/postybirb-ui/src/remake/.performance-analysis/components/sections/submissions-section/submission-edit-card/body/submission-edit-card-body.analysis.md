# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/body/submission-edit-card-body.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/body/submission-edit-card-body.tsx`

## Overview
Body content of the submission edit card (~55 lines). Conditionally renders: SubmissionFileManager (file type only), ScheduleForm, DefaultsForm, AccountSelectionForm.

## Memoization Usage
- [x] useCallback — `handleScheduleChange` ✅

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- `handleScheduleChange` depends on `[submission.id]`.

## Store Subscriptions
None directly — reads from context.

## Potential Issues
- **Renders 4 major child components** — any context change triggers re-render of all children. However, each child (DefaultsForm, AccountSelectionForm, etc.) reads context independently so their re-renders are expected.
- **`handleScheduleChange` makes API call** — correctly uses `useCallback` with `[submission.id]` dep.

## Recommendations
None — well-structured composition component.

---
*Status*: Analyzed
