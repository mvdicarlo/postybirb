# Performance Analysis

**Source**: `components/shared/submission-picker/submission-picker-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/submission-picker/submission-picker-modal.tsx`

## Overview
Modal wrapper around SubmissionPicker (125 lines). Provides merge/replace selection modes and displays current count. Syncs `selectedIds` from props when modal opens.

## Memoization Usage
None explicit.

## Re-render Triggers
- `useState` for `selectedIds`.
- `useEffect` syncs selectedIds when `initialSelectedIds` changes.
- Props: `opened`, `onClose`, `onSubmit`, `initialSelectedIds`, `submissionType`.

## Store Subscriptions
None directly — delegates to SubmissionPicker.

## Potential Issues
- **`useEffect` syncing `selectedIds`** — double-render on prop change. Standard React pattern, acceptable.
- **Inline arrow functions for button onClick** — `onSubmit(selectedIds, 'merge')` etc. New function per render but only in a modal context.

## Recommendations
None significant — modal-scoped component with limited render frequency.

---
*Status*: Analyzed
