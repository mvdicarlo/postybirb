# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/hooks/use-validations.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/hooks/use-validations.tsx`

## Overview
Hook to get validation messages for a specific field (~30 lines). Filters validation results by field name.

## Memoization Usage
- [x] useMemo — `validationMsgs` ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `option`, `submission`.
- `useMemo` deps: `[option.id, submission.validations, fieldName]`.

## Store Subscriptions
None.

## Potential Issues
- **`submission.validations` reference** — if validations array is recreated on every submission update, useMemo recomputes for every field. With 10 fields × 20 accounts = 200 recomputations per submission change.

## Recommendations
None — correctly memoized. Performance depends on `submission.validations` reference stability.

---
*Status*: Analyzed
