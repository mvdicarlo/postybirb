# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/account-selection/form/section-layout.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/account-selection/form/section-layout.tsx`

## Overview
Groups form fields by section and renders in grid (~130 lines). Contains `groupFieldsBySection` helper, GridItem, SectionGroupComponent, SectionLayout.

## Memoization Usage
- [x] useMemo — `sections` (from `groupFieldsBySection(formFields)`) ✅

## Re-render Triggers
- Context: `useFormFieldsContext()` — `formFields`, `isLoading`, `isError`, `option`.

## Store Subscriptions
None.

## Potential Issues
- **`groupFieldsBySection` is pure function** — correctly memoized, only recalculates when `formFields` changes.
- **Each GridItem renders a FormField** — FormField reads context, so all fields re-render together (see form-fields-context analysis).

## Recommendations
None — layout is well-structured. The per-field re-render issue is rooted in FormFieldsContext.

---
*Status*: Analyzed
