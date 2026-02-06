# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/form-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/form-field.tsx`

## Overview
Routes to appropriate field component based on field type (~110 lines). Switch statement maps `field.formField` to component. Evaluates `showWhen` visibility conditions.

## Memoization Usage
None.

## Re-render Triggers
- Props: `fieldName`, `field`.
- Context: `useFormFieldsContext()` — `getValue`, `option`, `submission`.
- `useValidations(fieldName)` — validation state.

## Store Subscriptions
None directly — reads from FormFieldsContext.

## Potential Issues
- **`evaluateShowWhen` called inline every render** — iterates `showWhen` array and calls `getValue`. Cheap but runs for every field on every context change.
- **All fields re-render when any value changes** — because `getValue` in FormFieldsContext changes (depends on `localValues` and `option.data`).

## Recommendations
- Consider memoizing visibility result per field.
- The root cause is FormFieldsContext value instability — see form-fields-context analysis.

---
*Status*: Analyzed
