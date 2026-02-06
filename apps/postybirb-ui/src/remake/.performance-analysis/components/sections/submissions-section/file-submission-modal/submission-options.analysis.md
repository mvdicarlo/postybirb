# Performance Analysis

**Source**: `components/sections/submissions-section/file-submission-modal/submission-options.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/sections/submissions-section/file-submission-modal/submission-options.tsx`

## Overview
Options panel for file submission modal (~120 lines). Segmented control toggles between custom options (rating/tags/description) and template picker.

## Memoization Usage
None.

## Re-render Triggers
- `useState` for `mode`.
- `useLingui()` — locale.
- Props: `type`, `rating`, `onRatingChange`, `tags`, `onTagsChange`, `description`, `onDescriptionChange`, `selectedTemplateId`, `onTemplateChange`.

## Store Subscriptions
None — prop-driven.

## Potential Issues
- **`handleModeChange` clears the other mode's data** — triggers multiple parent state updates on mode switch (rating + tags + description or templateId). Could batch.
- **`DescriptionEditor` renders in custom mode** — this is the BlockNote editor, which is heavy. Only mounted when mode is 'custom'.

## Recommendations
- Consider `React.memo` to prevent re-renders when parent file list changes.

---
*Status*: Analyzed
