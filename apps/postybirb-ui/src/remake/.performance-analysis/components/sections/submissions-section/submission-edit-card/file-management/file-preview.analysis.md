# Performance Analysis

**Source**: `components/sections/submissions-section/submission-edit-card/file-management/file-preview.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-edit-card/file-management/file-preview.tsx`

## Overview
File type-based preview renderer (~90 lines). Renders `<Image>`, `<video>`, `<audio>`, or icon based on file type. Also exports ThumbnailPreview.

## Memoization Usage
None.

## Re-render Triggers
- Props: `file`, `size`.

## Store Subscriptions
None.

## Potential Issues
- **`src` URL computed inline** — `\`${defaultTargetProvider()}/api/file/file/${id}?${hash}\`` every render. Minor — string is cheap.
- **ThumbnailPreview uses `Date.now()` cache-busting in FileActions** — but here uses `file.hash` which is stable. Good.

## Recommendations
- Consider `React.memo` — prevents re-render when parent updates but file hasn't changed.

---
*Status*: Analyzed
