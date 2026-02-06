# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/validation-alerts.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/validation-alerts.tsx`

## Overview
Displays non-field-specific validation messages (~60 lines). Filters out field-specific messages, shows only global errors/warnings.

## Memoization Usage
- [x] useMemo — `{ errors, warnings }` ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `option`, `submission`, `formFields`.

## Store Subscriptions
None.

## Potential Issues
- **`useMemo` deps include `formFields`** — if formFields object reference changes (unlikely with react-query caching), forces recomputation.

## Recommendations
None — well-memoized.

---
*Status*: Analyzed
