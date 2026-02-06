# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/file-preview.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/file-preview.tsx`

## Overview
File preview card (~130 lines). Generates canvas thumbnail on mount, inline title editing, delete/edit actions.

## Memoization Usage
- [x] useMemo — `preview` (thumbnail or icon) ✅
- [x] useCallback — `getTypeInfo`, `handleTitleSave`, `handleTitleKeyDown` ✅

## Re-render Triggers
- `useState` for `isEditingTitle`, `editedTitle`, `imageUrl`.
- `useEffect` for thumbnail generation (async, cleanup on unmount).
- Props: `item`, `onDelete`, `onEdit`, `onTitleChange`.

## Store Subscriptions
None.

## Potential Issues
- **`generateThumbnail` runs on mount** — creates canvas, blob URL. Correctly cleaned up on unmount. Good pattern.
- **`getTypeInfo` uses `useCallback` with [type]** — the function itself is cheap, `useCallback` here is unnecessary overhead.

## Recommendations
- Remove `useCallback` from `getTypeInfo` — inline function or plain `useMemo` is simpler.
- Wrap in `React.memo` to prevent re-renders in virtualized list.

---
*Status*: Analyzed
