# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/fields/field-label.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/fields/field-label.tsx`

## Overview
Wrapper component for field label and validation messages (~50 lines). Translates labels via `FieldLabelTranslations`. Renders errors/warnings.

## Memoization Usage
None.

## Re-render Triggers
- Props: `field`, `fieldName`, `validationState`, `children`.
- `useLingui()` — locale.

## Store Subscriptions
None.

## Potential Issues
- **`JSON.stringify(error.values)` used as key** — runs for each error/warning on every render. Minor.

## Recommendations
None — lightweight wrapper.

---
*Status*: Analyzed
