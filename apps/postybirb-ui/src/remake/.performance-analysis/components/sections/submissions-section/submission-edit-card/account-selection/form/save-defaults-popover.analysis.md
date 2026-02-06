# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/save-defaults-popover.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/save-defaults-popover.tsx`

## Overview
Popover for selecting and saving field values as account defaults (~160 lines). Checkbox list of fields, save selected to API.

## Memoization Usage
- [x] useCallback — `handleFieldToggle`, `handleSelectAll`, `handleSelectNone`, `handleSave` ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `formFields`, `option`, `submission`.
- `useLingui()` — locale.
- `useDisclosure` for popover open/close.
- `useState` for `selectedFields`, `isSaving`.

## Store Subscriptions
None.

## Potential Issues
- **`sortedFields` computed inline** — sorts all fields on every render. Should be memoized.
- **Re-renders on every FormFieldsContext change** — since this uses `useFormFieldsContext()`, it re-renders whenever any field value changes (due to getValue instability).

## Recommendations
- Memoize `sortedFields`.
- Only access `formFields`, `option`, `submission` from context (not `getValue`/`setValue`) to avoid unnecessary re-renders.

---
*Status*: Analyzed
