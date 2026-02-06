# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/file-dropzone.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/file-dropzone.tsx`

## Overview
Dropzone component with clipboard paste support (~140 lines). Accepts various MIME types based on submission type.

## Memoization Usage
- [x] useMemo — `acceptedMimeTypes` (keyed on type) ✅
- [x] useCallback — `handlePasteFromClipboard` ✅

## Re-render Triggers
- Props: `onDrop`, `isUploading`, `type`.
- `useEffect` for document paste listener.
- `useRef` for containerRef.

## Store Subscriptions
None.

## Potential Issues
- **Document-level paste event listener** — registered whenever modal is open. Correctly cleaned up.

## Recommendations
None.

---
*Status*: Analyzed
