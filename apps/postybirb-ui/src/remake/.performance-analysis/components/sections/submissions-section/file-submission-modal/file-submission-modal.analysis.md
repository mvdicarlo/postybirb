# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/file-submission-modal.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/file-submission-modal.tsx`

## Overview
Full-screen file upload modal (~240 lines). File dropzone + file list + options panel (tags/description/rating/template). Image editing. Progress bar.

## Memoization Usage
- [x] useCallback — `handleDrop`, `handleDelete`, `handleTitleChange`, `handleEdit`, `handleEditApply`, `handleUpload`, `handleClose` ✅

## Re-render Triggers
- Multiple `useState`: `fileItems`, `tags`, `description`, `rating`, `selectedTemplateId`, `isUploading`, `progress`, `editingFile`.
- `useEffect` for initialFiles, cleanup, and Escape key.
- Props: `opened`, `onClose`, `onUpload`, `type`, `initialFiles`.

## Store Subscriptions
None — self-contained modal.

## Potential Issues
- **8 `useState` hooks** — any state change triggers full modal re-render. The file list, options, and dropzone all re-render together.
- **`handleUpload` closes over all state** — deps array is large `[fileItems, tags, description, rating, selectedTemplateId, onUpload, onClose]`.
- **`setInterval` for progress simulation** — can leak if component unmounts during upload.

## Recommendations
- Consider `useReducer` to consolidate state.
- Use `useRef` for progress interval to ensure cleanup.
- Low priority — modal is open briefly for upload.

---
*Status*: Analyzed
