# Performance Analysis

**Source**: `components/shared/submission-picker/submission-picker.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/submission-picker/submission-picker.tsx`

## Overview
MultiSelect component for picking submissions by type (141 lines). Shows submission name and optional file thumbnail in option rendering. Uses `useSubmissionsByType(type)` for filtered data.

## Memoization Usage
- [x] useMemo — computes `{ options, metaMap }` from submissions (keyed on [submissions]) ✅

## Re-render Triggers
- `useSubmissionsByType(type)` — re-renders on submission store changes matching the type.
- Prop changes: `type`, `onChange`, `value`, `disabled`, `label`.

## Store Subscriptions
- Submission entity store (filtered by type).

## Potential Issues
- **`renderOption` is an inline function** — creates new function reference each render, passed to MultiSelect. MultiSelect may skip optimization since `renderOption` is always new.
- **Thumbnail `<img>` elements** — renders images inline for each option. With many submissions + many files, this creates many DOM elements. The `renderOption` callback is called for visible items only (Mantine virtualizes MultiSelect options), so this is manageable.

## Recommendations
- **Wrap `renderOption` in `useCallback`** (depends on `metaMap`).
- Low priority overall.

---
*Status*: Analyzed
