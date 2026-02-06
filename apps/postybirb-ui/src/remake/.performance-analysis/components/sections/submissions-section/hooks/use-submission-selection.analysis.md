# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-submission-selection.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-submission-selection.ts`

## Overview
Hook for managing multi-select with shift+click, ctrl+click, and select-all (~140 lines).

## Memoization Usage
- [x] useMemo — `selectedIds` (extracted from viewState) ✅
- [x] useMemo — `selectionState` (none/partial/all) ✅
- [x] useCallback — `updateSelection`, `handleSelect`, `handleToggleSelectAll`, `setSelectedIds` ✅

## Re-render Triggers
- `useNavigationStore` selector for `setViewState`.
- Props: `viewState`, `orderedSubmissions`.
- `useRef` for `lastSelectedIdRef` (no re-render).

## Store Subscriptions
- Navigation store (setViewState).

## Potential Issues
- **`handleSelect` depends on `viewState`, `orderedSubmissions`, `selectedIds`, `updateSelection`** — recreated on every selection or submission list change. This flows into `SubmissionsProvider.onSelect`.
- **`handleToggleSelectAll` depends on `selectionState`, `orderedSubmissions`, `updateSelection`** — also unstable.

## Recommendations
- Use `useNavigationStore.getState()` and `useRef` for `orderedSubmissions` to make callbacks stable.

---
*Status*: Analyzed
