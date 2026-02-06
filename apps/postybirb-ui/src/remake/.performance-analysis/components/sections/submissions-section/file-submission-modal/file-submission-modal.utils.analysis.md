# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/file-submission-modal.utils.ts`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/file-submission-modal.utils.ts`

## Overview
Utilities and types: `FileItem` interface, `getDefaultTitle`, `generateThumbnail` (canvas-based), MIME type constants.

## Memoization Usage
N/A — pure utilities.

## Re-render Triggers
N/A.

## Store Subscriptions
None.

## Potential Issues
- **`generateThumbnail` creates ObjectURLs** — callers must revoke them. Correctly documented with cleanup pattern in FilePreview.

## Recommendations
None.

---
*Status*: Analyzed
