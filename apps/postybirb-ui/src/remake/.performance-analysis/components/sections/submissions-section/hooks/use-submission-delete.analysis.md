# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-delete.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-delete.ts`

## Overview
Hook for submission deletion handlers (~65 lines). Single and bulk delete with notification and selection cleanup.

## Memoization Usage
- [x] useCallback — `handleDelete`, `handleDeleteSelected` ✅

## Re-render Triggers
- Props: `viewState`, `selectedIds`.
- `useNavigationStore` selector for `setViewState`.

## Store Subscriptions
- Navigation store (setViewState action only).

## Potential Issues
- **`handleDelete` and `handleDeleteSelected` depend on `viewState` and `selectedIds`** — recreated on every selection change. These callbacks flow down through context, causing context consumers to see new references.

## Recommendations
- Use `useNavigationStore.getState()` inside the callback to read `viewState` at call time instead of closing over it — would make callbacks stable.

---
*Status*: Analyzed
