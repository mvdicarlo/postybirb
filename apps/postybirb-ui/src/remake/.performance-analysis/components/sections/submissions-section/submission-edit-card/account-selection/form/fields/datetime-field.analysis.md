# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/datetime-field.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/datetime-field.tsx`

## Overview
Date/time picker field (~60 lines). Uses Mantine DateTimePicker with moment.js conversion.

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
- **`moment()` calls inline** — `moment(value).toDate()`, `moment(min).toDate()` etc. run every render. Cheap but could be memoized.

## Recommendations
None — lightweight.

---
*Status*: Analyzed
