# Performance Analysis

**Source**: `components/sections/submissions-section/submission-list.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-list.tsx`

## Overview
Virtualized, sortable submission list (~200 lines). Uses TanStack Virtual for windowing, dnd-kit for drag-and-drop reordering, DragOverlay for portal-based drag preview.

## Memoization Usage
- [x] useCallback — `handleDragStart`, `handleDragEnd`, `handleDragCancel` ✅

## Re-render Triggers
- `useSubmissionsContext()` — submissionType, selectedIds, isDragEnabled.
- `useIsCompactView()` — compact view toggle.
- Props: `isLoading`, `submissions`, `onReorder`.
- `useState` for `activeId` (drag overlay).
- Virtualizer scroll events.

## Store Subscriptions
- Submissions context (data + actions).
- Appearance store (compact view).

## Potential Issues
- **⚠️ MEDIUM: Context changes trigger full list re-render** — `useSubmissionsContext()` provides `selectedIds` which changes on every selection. This re-renders the entire list component, though virtualization limits actual DOM updates.
- **`submissionIds` array created on every render** — `submissions.map(s => s.id)` for SortableContext. Should be memoized.
- **`virtualizer.measure()` called in useEffect on `isCompact` change** — correct but triggers full re-measurement.
- **DragOverlay renders a full `SubmissionCard`** — acceptable, only during drag.

## Recommendations
- Memoize `submissionIds` with `useMemo`.
- Split context into data + actions (separate contexts) so action changes don't trigger list re-render.
- Consider extracting `selectedIds.includes()` check into SortableSubmissionCard via `useSubmissionsContext()` directly instead of passing as prop.

---
*Status*: Analyzed
