# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/file-uploader.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/file-uploader.tsx`

## Overview
Dropzone for uploading additional files (~100 lines). Validates file type compatibility with existing files.

## Memoization Usage
None.

## Re-render Triggers
- Context: `useSubmissionEditCardContext()` — `submission`.
- `useState` for `uploading`.

## Store Subscriptions
None.

## Potential Issues
- **`existingFileType` computed inline** — `getFileType(submission.files[0].fileName)` every render. Cheap but could be memoized.
- **`handleDrop` not memoized** — recreated on every render, passed to Dropzone.

## Recommendations
- Minor optimizations only. The Dropzone is rendered once per file manager.

---
*Status*: Analyzed
