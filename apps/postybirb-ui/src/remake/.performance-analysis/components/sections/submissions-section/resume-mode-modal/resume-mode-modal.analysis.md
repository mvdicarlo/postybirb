# Performance Analysis

**Source**: `components/sections/submissions-section/resume-mode-modal/resume-mode-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/resume-mode-modal/resume-mode-modal.tsx`

## Overview
Simple modal for selecting resume mode (~70 lines). Three radio options.

## Memoization Usage
None.

## Re-render Triggers
- Props: `opened`, `onClose`, `onConfirm`.
- `useState` for `selectedMode`.
- `useLingui()` — locale.

## Store Subscriptions
None.

## Potential Issues
None — simple, rarely open.

## Recommendations
None.

---
*Status*: Analyzed
