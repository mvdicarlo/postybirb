# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/radio-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/radio-field.tsx`

## Overview
Segmented control for radio/rating fields (~80 lines). RatingFieldControl (with default option) and InnerRadioField sub-components.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useFormFieldsContext()` — `getValue`, `setValue`, `option`.
- `useLingui()` — locale.
- `useDefaultOption(fieldName)`.
- `useValidations(fieldName)`.
- Props: `fieldName`, `field`.

## Store Subscriptions
None.

## Potential Issues
- **`options.map()` runs inline** — creates new array of label/value objects every render. Minor since options are small.

## Recommendations
None — lightweight.

---
*Status*: Analyzed
