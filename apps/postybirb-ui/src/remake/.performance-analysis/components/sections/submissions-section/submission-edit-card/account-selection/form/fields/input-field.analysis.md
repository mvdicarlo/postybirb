# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/input-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/input-field.tsx`

## Overview
Text input and textarea field (~70 lines). TextField (single-line) and TextAreaField (multi-line) sub-components.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`.
- `useDefaultOption(fieldName)`.
- `useValidations(fieldName)`.
- Props: `fieldName`, `field`.

## Store Subscriptions
None.

## Potential Issues
- **Controlled input with `setValue` on every keystroke** — each keystroke triggers `setValue` → `setLocalValues` → context value change → all fields re-render. The debounced save (500ms for strings) is correct but the context broadcast is immediate.

## Recommendations
- Consider uncontrolled input with `defaultValue` + `onBlur` to avoid per-keystroke context broadcasts.

---
*Status*: Analyzed
