# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/boolean-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/boolean-field.tsx`

## Overview
Checkbox field for boolean values (~30 lines).

## Memoization Usage
None.

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`.
- `useLingui()` — locale.
- `useValidations(fieldName)`.
- Props: `fieldName`, `field`.

## Store Subscriptions
None.

## Potential Issues
- **Re-renders when ANY field changes** — because `getValue` reference changes (FormFieldsContext instability).

## Recommendations
None — lightweight. Fix at context level.

---
*Status*: Analyzed
