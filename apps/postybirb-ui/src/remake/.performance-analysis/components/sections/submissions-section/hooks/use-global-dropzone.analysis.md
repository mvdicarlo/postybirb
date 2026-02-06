# Performance Analysis

**Source**: `components/sections/submissions-section/hooks/use-global-dropzone.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/hooks/use-global-dropzone.ts`

## Overview
Hook for global window drag-and-drop detection (~130 lines). Listens for file drag events on a target element, opens file submission modal.

## Memoization Usage
- [x] useCallback — `hasFiles`, `isWithinTarget`, `handleDragEnter`, `handleDragLeave`, `handleDragOver`, `handleDrop` ✅

## Re-render Triggers
- `useState` for `isDraggingOver`, `dragCounter`.
- Props: `isOpen`, `onOpen`, `onClose`, `enabled`, `targetElementId`.

## Store Subscriptions
None.

## Potential Issues
- **4 global window event listeners** (dragenter, dragleave, dragover, drop) — registered when enabled. Handlers are recreated when `isOpen`, `onOpen`, `onClose` change, causing listener churn.
- **`dragCounter` state pattern** — correct for nested element drag events, but `setDragCounter` inside `handleDragLeave` may cause stale state if multiple events fire.

## Recommendations
- Consider using `useRef` for `dragCounter` to avoid state-based re-renders during drag.
- Low priority — drag events are brief user interactions.

---
*Status*: Analyzed
