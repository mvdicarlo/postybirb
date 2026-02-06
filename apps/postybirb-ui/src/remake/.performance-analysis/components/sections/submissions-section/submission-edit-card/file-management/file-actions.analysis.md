# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/file-actions.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/file-actions.tsx`

## Overview
Primary file and thumbnail management panel (~220 lines). Replace file, upload thumbnail, crop from primary. Integrates ImageEditor modal.

## Memoization Usage
None.

## Re-render Triggers
- Props: `file`, `submissionId`.
- `useState` for `editorFile`, `editorTarget`, `isLoadingPrimary`.

## Store Subscriptions
None.

## Potential Issues
- **`handleCropFromPrimary` fetches the primary file blob** — network request on every crop action. Correctly sets loading state.
- **ThumbnailDisplay uses `Date.now()` cache-busting** — `src` changes every render, causing re-fetch of thumbnail image. This should use `file.hash` instead.
- **Event handlers not memoized** — `handleReplaceFile`, `handlePrimaryReplace`, `handleThumbnailUpload`, `handleCropFromPrimary`, `handleEditorClose`, `handleEditorApply` recreated every render. Passed to FileButton/ActionIcon.

## Recommendations
- **MEDIUM**: Fix ThumbnailDisplay cache-busting — use `file.hash` instead of `Date.now()` to prevent unnecessary image re-fetches.
- Wrap key handlers in `useCallback` if child components benefit.

---
*Status*: Analyzed
