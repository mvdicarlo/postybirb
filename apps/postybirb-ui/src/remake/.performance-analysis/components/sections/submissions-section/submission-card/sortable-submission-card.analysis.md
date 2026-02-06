# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/sortable-submission-card.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/sortable-submission-card.tsx`

## Overview
Sortable wrapper for SubmissionCard using dnd-kit (~55 lines). Uses `forwardRef` for virtualization compatibility.

## Memoization Usage
None — uses `forwardRef` but no `React.memo`.

## Re-render Triggers
- `useSortable({ id, disabled })` — dnd-kit internal state (transform, transition, isDragging).
- Props: all `SubmissionCardProps` + `id`, `virtualIndex`, `draggable`.

## Store Subscriptions
None directly — dnd-kit context.

## Potential Issues
- **Not wrapped in `React.memo`** — parent re-render (from SubmissionList or context change) propagates to all sortable cards.
- **`useSortable` hook has internal state** that changes during drag operations — acceptable.

## Recommendations
- Wrap in `React.memo` (in conjunction with SubmissionCard memo).

---
*Status*: Analyzed
