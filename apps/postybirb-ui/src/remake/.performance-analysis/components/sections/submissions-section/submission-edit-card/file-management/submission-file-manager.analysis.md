# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/submission-file-manager.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/submission-file-manager.tsx`

## Overview
File cards container with SortableJS drag-and-drop reordering (~120 lines). Orders files, persists reorder to backend.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- `useState` for `orderedFiles`.
- `useEffect` syncs `orderedFiles` from `submission.files`.
- `useEffect` creates/destroys SortableJS instance on `orderedFiles` change.
- `useRef` for container ref.

## Store Subscriptions
None directly — reads from context.

## Potential Issues
- **⚠️ SortableJS recreated on every `orderedFiles` change** — the second `useEffect` depends on `[orderedFiles]`, so after every reorder (which calls `setOrderedFiles`), the Sortable instance is destroyed and recreated. This is expensive and can cause visual jank.
- **Double `useEffect` pattern** — first effect syncs from props, second creates sortable. If `fileIds` changes, both fire sequentially.
- **`fileIds` computed inline** — `submission.files.map(f => f.id).join(',')` runs every render, creating string.

## Recommendations
- **HIGH**: Move SortableJS `onEnd` handler to a ref-based callback so the Sortable instance doesn't need recreation. Only destroy/recreate when file count changes.
- Memoize `fileIds` or use `useMemo` for `orderedFiles` initialization.

---
*Status*: Analyzed
