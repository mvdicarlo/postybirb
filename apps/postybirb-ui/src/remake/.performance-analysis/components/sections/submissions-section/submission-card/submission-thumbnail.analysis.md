# Performance Analysis

**Source**: `components/sections/submissions-section/submission-card/submission-thumbnail.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/submission-card/submission-thumbnail.tsx`

## Overview
Thumbnail component with optional HoverCard preview (~70 lines). Shows file count indicator.

## Memoization Usage
None.

## Re-render Triggers
Props: `thumbnailUrl`, `alt`, `canPreview`, `fileCount`.

## Store Subscriptions
None — pure presentational.

## Potential Issues
- **HoverCard wraps thumbnail when `canPreview` is true** — Mantine HoverCard mounts/unmounts dropdown. The lazy `loading="lazy"` on preview image is good.
- Not wrapped in `React.memo` — re-renders with parent card.

## Recommendations
- Wrap in `React.memo` — props are primitive/stable.

---
*Status*: Analyzed
