# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/actions/apply-template-action.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/actions/apply-template-action.tsx`

## Overview
Action button to open template picker modal (~40 lines). Lazy-renders TemplatePickerModal only when open.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`, `targetSubmissionIds`.
- `useState` for `isModalOpen`.

## Store Subscriptions
None.

## Potential Issues
- **`targetIds` computed inline** — creates new array reference every render. Should be memoized.

## Recommendations
- Memoize `targetIds` with `useMemo`.
- Low priority — component is lightweight.

---
*Status*: Analyzed
