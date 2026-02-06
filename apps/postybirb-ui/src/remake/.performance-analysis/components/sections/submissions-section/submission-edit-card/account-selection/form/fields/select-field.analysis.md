# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/select-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/select-field.tsx`

## Overview
Select/multi-select dropdown (~100 lines). Handles discriminator-based options (overallFileType), group flattening, and `uniqBy` deduplication.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`, `submission`.
- `useValidations(fieldName)`.
- Props: `fieldName`, `field`.

## Store Subscriptions
None.

## Potential Issues
- **`getSelectOptions` and `flattenOptions` computed inline** — `uniqBy(flattenOptions(...))` runs every render. Should be memoized for complex option sets.

## Recommendations
- Memoize `flatOptions` with `useMemo`.

---
*Status*: Analyzed
