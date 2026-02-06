# Performance Analysis

**Source**: `components/shared/description-editor/custom-blocks/inline-system-shortcuts.tsx`
**Full Path**: `apps/postybirb-ui/src/remake/components/shared/description-editor/custom-blocks/inline-system-shortcuts.tsx`

## Overview
Three BlockNote inline content specs: InlineTitleShortcut, InlineTagsShortcut, InlineContentWarningShortcut (131 lines). Each renders a colored Badge. Also exports `getSystemShortcutsMenuItems` factory.

## Memoization Usage
None — all render functions return static JSX (no hooks).

## Re-render Triggers
BlockNote controls rendering. No hooks, no state.

## Store Subscriptions
None.

## Potential Issues
None — pure static renders.

## Recommendations
None.

---
*Status*: Analyzed
