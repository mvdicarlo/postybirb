# Performance Analysis

**Source**: `components/shared/template-picker/template-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/template-picker/template-picker.tsx`

## Overview
Simple Select dropdown for picking a template submission (64 lines).

## Memoization Usage
- [x] useMemo — `options` array from template submissions ✅

## Re-render Triggers
- `useTemplateSubmissions()` — re-renders on template store changes.
- Prop changes: `onChange`, `value`, `label`, `placeholder`.

## Store Subscriptions
- Template submission entity store.

## Potential Issues
None — simple select, data well-memoized.

## Recommendations
None.

---
*Status*: Analyzed
