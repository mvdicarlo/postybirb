# Performance Analysis

**Source**: `components/shared/reorderable-submission-list/reorderable-submission-list.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/reorderable-submission-list/reorderable-submission-list.tsx`

## Overview
Drag-and-drop reorderable submission list (158 lines). Uses Sortable.js for drag-drop and Arrow key keyboard navigation. Renders Paper cards with grip handle, title, and optional `renderExtra` content.

## Memoization Usage
- [x] useCallback — `handleKeyDown` (keyed on submissions, onReorder) ✅

## Re-render Triggers
- Prop changes: `submissions`, `onReorder`, `renderExtra`.
- `useEffect` for Sortable.js initialization (recreates on submissions/onReorder change).
- `useEffect` for focus restoration.

## Store Subscriptions
None — pure prop-driven.

## Potential Issues
- **⚠️ Sortable.js recreated on every `submissions` or `onReorder` change** — the `useEffect` destroys and recreates the Sortable instance. After a reorder, `submissions` array changes → useEffect fires → new Sortable instance. This is O(N) per reorder.
- **`handleKeyDown` recreated when `submissions` changes** — since it depends on the full array, every reorder creates a new callback.

## Recommendations
- **Use a ref to store `submissions`** and access it in Sortable's `onEnd` instead of recreating Sortable. This would avoid the destroy/recreate cycle.
- Low priority — Sortable creation is cheap and list is typically small.

---
*Status*: Analyzed
