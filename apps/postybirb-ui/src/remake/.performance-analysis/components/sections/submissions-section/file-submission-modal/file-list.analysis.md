# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/file-list.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/file-list.tsx`

## Overview
Virtualized file list for upload modal (~100 lines). Uses TanStack Virtual for windowed rendering of FilePreview cards.

## Memoization Usage
None.

## Re-render Triggers
- Props: `fileItems`, `onDelete`, `onTitleChange`, `onEdit`.
- `useRef` for scrollContainerRef.
- Virtualizer internal state.

## Store Subscriptions
None.

## Potential Issues
- **`key={item.file.name}`** — files with the same name will collide. Should use index or a unique ID.

## Recommendations
- Use a unique key per file item (e.g., combine name + index or add a UUID).

---
*Status*: Analyzed
