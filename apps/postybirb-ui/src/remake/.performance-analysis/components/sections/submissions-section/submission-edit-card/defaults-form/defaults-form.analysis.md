# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/defaults-form/defaults-form.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/defaults-form/defaults-form.tsx`

## Overview
Collapsible form for editing default submission options (~60 lines). Wraps SectionLayout in FormFieldsProvider.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- `useDisclosure` for expand/collapse.
- `submission.getDefaultOptions()` called inline every render.

## Store Subscriptions
None — reads from context.

## Potential Issues
- **`submission.getDefaultOptions()` called on every render** — if this method creates a new object each time, children will receive new props. Should be memoized or cached in the Record class.

## Recommendations
- Memoize the result of `getDefaultOptions()` or ensure it returns a stable reference.

---
*Status*: Analyzed
